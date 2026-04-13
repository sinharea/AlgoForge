const { executionEnabled, executionMode } = require("../config/env");
const { runDocker, runLocal } = require("./executionService");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

const MAX_TRACE_STEPS = 600;

const buildPythonTraceRuntime = (userCode) => {
  const safeCodeLiteral = JSON.stringify(String(userCode || ""));

  return `import ast
import builtins
import contextlib
import io
import json
import sys

USER_CODE = ${safeCodeLiteral}
FILENAME = "<user_code>"
MAX_STEPS = ${MAX_TRACE_STEPS}
MAX_ITEMS = 20
MAX_STRING_LENGTH = 160

steps = []
_step_counter = 0


def _serialize(value, depth=0):
    if depth > 2:
        return "<depth_limit>"

    if isinstance(value, (int, float, bool)) or value is None:
        return value

    if isinstance(value, str):
        if len(value) > MAX_STRING_LENGTH:
            return value[:MAX_STRING_LENGTH] + "...<truncated>"
        return value

    if isinstance(value, list):
        return [_serialize(v, depth + 1) for v in value[:MAX_ITEMS]]

    if isinstance(value, tuple):
        return [_serialize(v, depth + 1) for v in list(value)[:MAX_ITEMS]]

    if isinstance(value, set):
        return [_serialize(v, depth + 1) for v in list(value)[:MAX_ITEMS]]

    if isinstance(value, dict):
        output = {}
        for idx, (k, v) in enumerate(value.items()):
            if idx >= MAX_ITEMS:
                break
            output[str(k)] = _serialize(v, depth + 1)
        return output

    try:
        return repr(value)[:MAX_STRING_LENGTH]
    except Exception:
        return "<unserializable>"


def _build_state(local_vars):
    variables = {}
    data_structures = {}

    for key, value in local_vars.items():
        key_text = str(key)
        if key_text.startswith("__"):
            continue
        if callable(value):
            continue

        serialized = _serialize(value)
        if isinstance(value, (list, tuple, set, dict)):
            data_structures[key_text] = serialized
        else:
            variables[key_text] = serialized

    return {
        "variables": variables,
        "data_structures": data_structures,
    }


def _push_step(description, local_vars):
    global _step_counter
    _step_counter += 1

    if _step_counter > MAX_STEPS:
        raise RuntimeError("Trace step limit exceeded")

    steps.append({
        "step": _step_counter,
        "description": description,
        "state": _build_state(local_vars),
    })


def __trace_assignment(line_no, targets, local_vars):
    _push_step(f"{targets} updated at line {line_no}", dict(local_vars))


def __trace_loop(line_no, local_vars):
    _push_step(f"Loop iteration at line {line_no}", dict(local_vars))


def __trace_condition(result, line_no, local_vars):
    _push_step(f"Condition at line {line_no} evaluated to {bool(result)}", dict(local_vars))
    return result


class TraceTransformer(ast.NodeTransformer):
    def _locals_call(self):
        return ast.Call(func=ast.Name(id="locals", ctx=ast.Load()), args=[], keywords=[])

    def _target_text(self, target):
        if isinstance(target, ast.Name):
            return target.id

        if isinstance(target, (ast.Tuple, ast.List)):
            return ", ".join(self._target_text(item) for item in target.elts)

        try:
            return ast.unparse(target)
        except Exception:
            return "value"

    def _assignment_trace(self, line_no, target_text):
        return ast.Expr(
            value=ast.Call(
                func=ast.Name(id="__trace_assignment", ctx=ast.Load()),
                args=[
                    ast.Constant(value=int(line_no)),
                    ast.Constant(value=str(target_text)),
                    self._locals_call(),
                ],
                keywords=[],
            )
        )

    def _loop_trace(self, line_no):
        return ast.Expr(
            value=ast.Call(
                func=ast.Name(id="__trace_loop", ctx=ast.Load()),
                args=[ast.Constant(value=int(line_no)), self._locals_call()],
                keywords=[],
            )
        )

    def visit_Assign(self, node):
        node = self.generic_visit(node)
        target_text = ", ".join(self._target_text(t) for t in node.targets) or "assignment"
        trace_stmt = ast.copy_location(self._assignment_trace(node.lineno, target_text), node)
        return [node, trace_stmt]

    def visit_AugAssign(self, node):
        node = self.generic_visit(node)
        target_text = self._target_text(node.target) or "assignment"
        trace_stmt = ast.copy_location(self._assignment_trace(node.lineno, target_text), node)
        return [node, trace_stmt]

    def visit_AnnAssign(self, node):
        node = self.generic_visit(node)
        target_text = self._target_text(node.target) or "assignment"
        trace_stmt = ast.copy_location(self._assignment_trace(node.lineno, target_text), node)
        return [node, trace_stmt]

    def visit_For(self, node):
        node = self.generic_visit(node)
        node.body.insert(0, ast.copy_location(self._loop_trace(node.lineno), node))
        return node

    def visit_While(self, node):
        node = self.generic_visit(node)
        node.body.insert(0, ast.copy_location(self._loop_trace(node.lineno), node))
        return node

    def visit_If(self, node):
        node = self.generic_visit(node)
        node.test = ast.Call(
            func=ast.Name(id="__trace_condition", ctx=ast.Load()),
            args=[node.test, ast.Constant(value=int(node.lineno)), self._locals_call()],
            keywords=[],
        )
        return node


def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    allowed_modules = {
        "math",
        "collections",
        "heapq",
        "bisect",
        "itertools",
        "functools",
        "string",
        "re",
        "sys",
    }

    root = str(name).split(".")[0]
    if root not in allowed_modules:
        raise ImportError(f"Import '{root}' is blocked in tracer sandbox")

    return builtins.__import__(name, globals, locals, fromlist, level)


safe_builtin_names = [
    "abs",
    "all",
    "any",
    "bool",
    "dict",
    "enumerate",
    "filter",
    "float",
    "int",
    "len",
    "locals",
    "list",
    "map",
    "max",
    "min",
    "pow",
    "print",
    "range",
    "reversed",
    "round",
    "set",
    "sorted",
    "str",
    "sum",
    "tuple",
    "zip",
    "input",
    "Exception",
    "ValueError",
    "TypeError",
    "KeyError",
    "IndexError",
    "RuntimeError",
    "isinstance",
    "getattr",
    "setattr",
    "__build_class__",
    "object",
]

safe_builtins = {name: getattr(builtins, name) for name in safe_builtin_names}
safe_builtins["__import__"] = _safe_import

captured_stdout = io.StringIO()
error_text = None

try:
    parsed = ast.parse(USER_CODE, filename=FILENAME)
    instrumented = TraceTransformer().visit(parsed)
    ast.fix_missing_locations(instrumented)

    compiled = compile(instrumented, FILENAME, "exec")
    globals_scope = {
        "__name__": "__main__",
        "__builtins__": safe_builtins,
        "__trace_assignment": __trace_assignment,
        "__trace_loop": __trace_loop,
        "__trace_condition": __trace_condition,
    }

    with contextlib.redirect_stdout(captured_stdout):
        exec(compiled, globals_scope, globals_scope)
except Exception as exc:
    error_text = str(exc)

payload = {
    "steps": steps,
    "error": error_text,
}

sys.__stdout__.write(json.dumps(payload, ensure_ascii=True))
`;
};

const parseTracePayload = (stdout) => {
  const output = String(stdout || "").trim();
  if (!output) return null;

  try {
    return JSON.parse(output);
  } catch {
    const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        return JSON.parse(lines[i]);
      } catch {
        // Continue to find a JSON line.
      }
    }
  }

  return null;
};

const normalizeTraceSteps = (rawSteps) => {
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps.map((entry, index) => {
    const state = entry?.state && typeof entry.state === "object" ? entry.state : {};
    const variables = state.variables && typeof state.variables === "object" ? state.variables : {};
    const dataStructures = state.data_structures && typeof state.data_structures === "object"
      ? state.data_structures
      : {};

    return {
      step: Number(entry?.step) || index + 1,
      description: String(entry?.description || `Step ${index + 1}`),
      state: {
        variables,
        data_structures: dataStructures,
      },
    };
  });
};

const traceExecution = async ({ code, input = "", language }) => {
  if (!executionEnabled) {
    throw new ApiError(503, "Execution is disabled");
  }

  if (language !== "python") {
    throw ApiError.badRequest("Execution tracer currently supports python only");
  }

  if (executionMode === "api") {
    throw ApiError.badRequest("Execution tracer is unavailable for EXECUTION_MODE=api");
  }

  const runtimeCode = buildPythonTraceRuntime(code);

  let result;
  if (executionMode === "docker") {
    result = await runDocker({ language: "python", code: runtimeCode, stdin: input || "" });
  } else {
    result = await runLocal({ language: "python", code: runtimeCode, stdin: input || "" });
  }

  if (result.timedOut) {
    throw new ApiError(408, "Trace execution timed out");
  }

  const payload = parseTracePayload(result.stdout);
  if (!payload) {
    logger.warn("Trace payload parse failed", {
      stderr: String(result.stderr || "").slice(0, 500),
      stdout: String(result.stdout || "").slice(0, 500),
    });
    throw ApiError.internal("Failed to parse trace output");
  }

  const steps = normalizeTraceSteps(payload.steps);

  if (payload.error) {
    const fallbackState = steps.length > 0
      ? steps[steps.length - 1].state
      : { variables: {}, data_structures: {} };

    steps.push({
      step: steps.length + 1,
      description: `Execution stopped: ${String(payload.error)}`,
      state: fallbackState,
    });
  }

  return steps;
};

module.exports = {
  traceExecution,
};
