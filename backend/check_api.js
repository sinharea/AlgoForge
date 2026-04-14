const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, ".env") });

const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_DEFAULT_MODEL = "openai/gpt-oss-120b:free";

const getRequired = (keyCandidates) => {
  for (const key of keyCandidates) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error(`Missing environment variable: ${keyCandidates.join(" or ")}`);
};

async function main() {
  const { OpenRouter } = await import("@openrouter/sdk");

  const apiKey = getRequired(["OPENAI_API_KEY", "OPENROUTER_API_KEY"]);
  const configuredBaseUrl = String(process.env.OPENAI_BASE_URL || "").trim();
  const normalizedConfiguredBaseUrl = configuredBaseUrl.replace(/\/+$/, "");
  const isOpenRouterKey = String(apiKey).startsWith("sk-or-");
  const pointsToOpenAi = /api\.openai\.com/i.test(normalizedConfiguredBaseUrl);
  const baseUrl =
    isOpenRouterKey && (!normalizedConfiguredBaseUrl || pointsToOpenAi)
      ? OPENROUTER_DEFAULT_BASE_URL
      : normalizedConfiguredBaseUrl || OPENROUTER_DEFAULT_BASE_URL;
  const model = process.env.OPENAI_MODEL || OPENROUTER_DEFAULT_MODEL;
  const prompt =
    process.argv.slice(2).join(" ").trim() ||
    "who are you";

  const openrouter = new OpenRouter({
    apiKey,
    serverURL: baseUrl,
  });

  console.log(`Calling OpenRouter API with model: ${model}`);

  try {
    const stream = await openrouter.chat.send({
      chatRequest: {
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: true,
      },
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        process.stdout.write(content);
      }

      if (chunk.usage) {
        console.log("\n\nUsage info:", JSON.stringify(chunk.usage, null, 2));
        if (chunk.usage.reasoningTokens !== undefined) {
          console.log("Reasoning tokens:", chunk.usage.reasoningTokens);
        }
      }
    }

    console.log("\n\nAPI call completed successfully!");
  } catch (error) {
    console.error("API Error:", error.message);
    if (error.cause) {
      console.error("Details:", error.cause);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});