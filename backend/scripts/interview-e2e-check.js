const base = "http://localhost:5000/api";

async function req(method, path, body, token) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    json = { raw };
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} ${response.status}: ${JSON.stringify(json)}`);
  }

  return json;
}

(async () => {
  const runId = Date.now();
  const email = `interview-check-${runId}@test.dev`;
  const password = "Password123!";

  const register = await req("POST", "/auth/register", {
    name: `Interview Check ${runId}`,
    email,
    password,
  });

  const token = register.accessToken || register.token;
  if (!token) {
    throw new Error("Register succeeded but access token missing");
  }

  const problems = await req("GET", "/problems?limit=1", undefined, token);
  const problem = problems?.items?.[0];
  if (!problem?._id) {
    throw new Error("No problem found for interview test");
  }

  const start = await req("POST", "/interview/start", { problemId: problem._id }, token);
  const sessionId = start.sessionId;

  const c1 = await req(
    "POST",
    "/interview/respond",
    {
      sessionId,
      userMessage: "binary search",
    },
    token
  );

  const c2 = await req(
    "POST",
    "/interview/respond",
    {
      sessionId,
      userMessage: "who are you",
    },
    token
  );

  const c3 = await req(
    "POST",
    "/interview/respond",
    {
      sessionId,
      userMessage: "i dont know",
    },
    token
  );

  const summary = {
    email,
    problem: problem.title,
    sessionId,
    start: start.messages?.[start.messages.length - 1]?.content,
    afterGoodAnswer: c1.interviewerMessage?.content,
    afterOffTopic: c2.interviewerMessage?.content,
    afterIdk: c3.interviewerMessage?.content,
    stages: [c1.currentStage, c2.currentStage, c3.currentStage],
  };

  console.log(JSON.stringify(summary, null, 2));
})().catch((error) => {
  console.error("TEST_ERROR");
  console.error(error.message);
  process.exit(1);
});
