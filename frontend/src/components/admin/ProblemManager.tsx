"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { adminApi } from "@/src/api/adminApi";

type Difficulty = "Easy" | "Medium" | "Hard";

type ProblemListItem = {
  _id: string;
  questionNumber?: number;
  title: string;
  slug: string;
  difficulty: Difficulty;
  tags: string[];
  hiddenTestCaseCount?: number;
};

type InlineTestCase = {
  input: string;
  output: string;
  isHidden: boolean;
};

const initialProblemForm = {
  title: "",
  description: "",
  difficulty: "Easy" as Difficulty,
  tags: "",
  constraints: "",
};

const makeEmptyTestCase = (): InlineTestCase => ({
  input: "",
  output: "",
  isHidden: true,
});

export default function ProblemManager() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState(initialProblemForm);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);

  const [selectedProblemId, setSelectedProblemId] = useState("");
  const [inlineTestCases, setInlineTestCases] = useState<InlineTestCase[]>([makeEmptyTestCase()]);
  const [inputFiles, setInputFiles] = useState<File[]>([]);
  const [outputFiles, setOutputFiles] = useState<File[]>([]);
  const [fileHiddenFlags, setFileHiddenFlags] = useState<boolean[]>([]);

  const problemsQuery = useQuery({
    queryKey: ["admin-problem-list"],
    queryFn: async () => (await adminApi.listProblems({ page: 1, limit: 100 })).data,
  });

  const problems: ProblemListItem[] = useMemo(
    () => (problemsQuery.data?.items || []) as ProblemListItem[],
    [problemsQuery.data]
  );

  useEffect(() => {
    if (!selectedProblemId && problems.length) {
      setSelectedProblemId(problems[0]._id);
    }
  }, [problems, selectedProblemId]);

  const createProblemMutation = useMutation({
    mutationFn: async () => {
      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      return adminApi.createProblem({
        title: form.title.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty,
        tags,
        constraints: form.constraints.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Problem created");
      setForm(initialProblemForm);
      queryClient.invalidateQueries({ queryKey: ["admin-problem-list"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to create problem";
      toast.error(message);
    },
  });

  const updateProblemMutation = useMutation({
    mutationFn: async () => {
      if (!editingProblemId) return;

      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      return adminApi.updateProblem(editingProblemId, {
        title: form.title.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty,
        tags,
        constraints: form.constraints.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Problem updated");
      setEditingProblemId(null);
      setForm(initialProblemForm);
      queryClient.invalidateQueries({ queryKey: ["admin-problem-list"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to update problem";
      toast.error(message);
    },
  });

  const deleteProblemMutation = useMutation({
    mutationFn: async (problemId: string) => adminApi.deleteProblem(problemId),
    onSuccess: () => {
      toast.success("Problem deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-problem-list"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to delete problem";
      toast.error(message);
    },
  });

  const uploadTestCasesMutation = useMutation({
    mutationFn: async (formData: FormData) => adminApi.uploadTestcases(formData),
    onSuccess: (response) => {
      const count = response.data?.createdCount || 0;
      toast.success(`Uploaded ${count} test cases`);
      setInlineTestCases([makeEmptyTestCase()]);
      setInputFiles([]);
      setOutputFiles([]);
      setFileHiddenFlags([]);
      queryClient.invalidateQueries({ queryKey: ["admin-problem-list"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to upload test cases";
      toast.error(message);
    },
  });

  const syncFileHiddenFlags = (nextInputFiles: File[], nextOutputFiles: File[]) => {
    const pairCount = Math.max(nextInputFiles.length, nextOutputFiles.length);
    setFileHiddenFlags((prev) =>
      Array.from({ length: pairCount }, (_, index) => (prev[index] !== undefined ? prev[index] : true))
    );
  };

  const startEditProblem = async (problemId: string) => {
    setEditingLoading(true);
    try {
      const data = (await adminApi.getProblem(problemId)).data;
      setEditingProblemId(problemId);
      setForm({
        title: data.title || "",
        description: data.description || "",
        difficulty: data.difficulty || "Easy",
        tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
        constraints: data.constraints || "",
      });
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || "Failed to load problem details";
      toast.error(message);
    } finally {
      setEditingLoading(false);
    }
  };

  const handleProblemSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    if (editingProblemId) {
      await updateProblemMutation.mutateAsync();
      return;
    }

    await createProblemMutation.mutateAsync();
  };

  const handleDeleteProblem = async (problemId: string) => {
    const proceed = window.confirm("Delete this problem?");
    if (!proceed) return;
    await deleteProblemMutation.mutateAsync(problemId);
  };

  const handleUploadTestCases = async () => {
    if (!selectedProblemId) {
      toast.error("Select a problem for testcase upload");
      return;
    }

    const nonEmptyInline = inlineTestCases.filter(
      (item) => item.input.trim().length > 0 || item.output.trim().length > 0
    );

    const pairCount = Math.max(inputFiles.length, outputFiles.length);
    if (!nonEmptyInline.length && pairCount === 0) {
      toast.error("Add at least one inline testcase or file pair");
      return;
    }

    const formData = new FormData();
    formData.append("problemId", selectedProblemId);

    if (nonEmptyInline.length) {
      formData.append("testcases", JSON.stringify(nonEmptyInline));
    }

    if (pairCount > 0) {
      formData.append(
        "fileMeta",
        JSON.stringify(
          Array.from({ length: pairCount }, (_, index) => ({
            isHidden: fileHiddenFlags[index] !== false,
          }))
        )
      );
    }

    inputFiles.forEach((file) => formData.append("inputFiles", file));
    outputFiles.forEach((file) => formData.append("outputFiles", file));

    await uploadTestCasesMutation.mutateAsync(formData);
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Problem Manager</h2>
          {editingProblemId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditingProblemId(null);
                setForm(initialProblemForm);
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            className="input"
            placeholder="Problem title"
          />

          <select
            value={form.difficulty}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, difficulty: event.target.value as Difficulty }))
            }
            className="input select"
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        <textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          className="input min-h-[160px]"
          placeholder="Markdown description"
        />

        <input
          value={form.tags}
          onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
          className="input"
          placeholder="Tags (comma separated): array, hash-map"
        />

        <textarea
          value={form.constraints}
          onChange={(event) => setForm((prev) => ({ ...prev, constraints: event.target.value }))}
          className="input min-h-[100px]"
          placeholder="Constraints"
        />

        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleProblemSubmit}
            disabled={
              createProblemMutation.isPending || updateProblemMutation.isPending || editingLoading
            }
          >
            {editingProblemId
              ? updateProblemMutation.isPending
                ? "Saving..."
                : "Edit"
              : createProblemMutation.isPending
                ? "Creating..."
                : "Create"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold">Existing Problems</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)]">
                <th className="px-3 py-2">Q#</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Difficulty</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <tr key={problem._id} className="border-t border-[var(--border-color)]">
                  <td className="px-3 py-2">{problem.questionNumber || "-"}</td>
                  <td className="px-3 py-2">{problem.title}</td>
                  <td className="px-3 py-2">{problem.difficulty}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => startEditProblem(problem._id)}
                        disabled={editingLoading}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn"
                        style={{ background: "rgba(239,68,68,.15)", color: "#fca5a5" }}
                        onClick={() => handleDeleteProblem(problem._id)}
                        disabled={deleteProblemMutation.isPending}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {problems.length === 0 && !problemsQuery.isLoading && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-[var(--text-secondary)]">
                    No problems found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-lg font-semibold">Test Case Manager</h3>

        <select
          value={selectedProblemId}
          onChange={(event) => setSelectedProblemId(event.target.value)}
          className="input select"
        >
          <option value="">Select problem</option>
          {problems.map((problem) => (
            <option key={problem._id} value={problem._id}>
              {problem.questionNumber || "-"}. {problem.title}
            </option>
          ))}
        </select>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <p className="mb-3 text-sm font-medium">Inline Testcases (MongoDB)</p>
          <div className="space-y-3">
            {inlineTestCases.map((testCase, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-[var(--border-color)] p-3">
                <textarea
                  value={testCase.input}
                  onChange={(event) =>
                    setInlineTestCases((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, input: event.target.value } : item
                      )
                    )
                  }
                  className="input min-h-[80px]"
                  placeholder="Input"
                />
                <textarea
                  value={testCase.output}
                  onChange={(event) =>
                    setInlineTestCases((prev) =>
                      prev.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, output: event.target.value } : item
                      )
                    )
                  }
                  className="input min-h-[80px]"
                  placeholder="Output"
                />
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={testCase.isHidden}
                    onChange={(event) =>
                      setInlineTestCases((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, isHidden: event.target.checked } : item
                        )
                      )
                    }
                  />
                  Hidden testcase
                </label>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setInlineTestCases((prev) => [...prev, makeEmptyTestCase()])}
            >
              Add Testcase
            </button>
            {inlineTestCases.length > 1 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setInlineTestCases((prev) => prev.slice(0, -1))}
              >
                Remove Last
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <p className="mb-3 text-sm font-medium">File Upload Testcases (Local storage)</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">Input files</label>
              <input
                type="file"
                multiple
                className="input"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setInputFiles(files);
                  syncFileHiddenFlags(files, outputFiles);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">Output files</label>
              <input
                type="file"
                multiple
                className="input"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setOutputFiles(files);
                  syncFileHiddenFlags(inputFiles, files);
                }}
              />
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {Array.from({ length: Math.max(inputFiles.length, outputFiles.length) }).map((_, index) => (
              <label key={index} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={fileHiddenFlags[index] !== false}
                  onChange={(event) =>
                    setFileHiddenFlags((prev) =>
                      prev.map((flag, flagIndex) =>
                        flagIndex === index ? event.target.checked : flag
                      )
                    )
                  }
                />
                File testcase #{index + 1} hidden
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUploadTestCases}
            disabled={uploadTestCasesMutation.isPending}
          >
            {uploadTestCasesMutation.isPending ? "Uploading..." : "Upload Testcases"}
          </button>
        </div>
      </div>
    </div>
  );
}
