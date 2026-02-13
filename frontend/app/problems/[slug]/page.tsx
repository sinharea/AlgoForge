import { notFound } from "next/navigation";

interface Problem {
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  constraints: string;
  sampleTestCases: {
    input: string;
    expectedOutput: string;
  }[];
}

async function getProblem(slug: string): Promise<Problem | null> {
  try {
    const res = await fetch(
      `http://localhost:5000/api/problems/slug/${slug}`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;

    return res.json();
  } catch {
    return null;
  }
}
 // corrected
export default async function ProblemDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  console.log("Fetching problem with slug:", slug);

  const problem = await getProblem(slug);

  if (!problem) return notFound();

  return (
    <main className="min-h-screen bg-[#0b1220] text-white px-8 py-20">
      <div className="max-w-4xl mx-auto space-y-8">

        <h1 className="text-4xl font-bold">
          {problem.title}
        </h1>

        <p className="text-gray-400">
          Difficulty: {problem.difficulty}
        </p>

        <div>
          <h2 className="text-xl font-semibold mb-2">Description</h2>
          <p className="text-gray-300">{problem.description}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Constraints</h2>
          <p className="text-gray-300">{problem.constraints}</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Sample Test Cases</h2>
          {problem.sampleTestCases.map((test, index) => (
            <div
              key={index}
              className="bg-white/5 p-4 rounded-lg mb-4"
            >
              <p><strong>Input:</strong> {test.input}</p>
              <p><strong>Output:</strong> {test.expectedOutput}</p>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
