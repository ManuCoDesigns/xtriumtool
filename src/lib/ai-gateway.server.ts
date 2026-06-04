import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Creates a Groq LLM provider.
 * Requires GROQ_API_KEY environment variable.
 * Get a free API key from https://console.groq.com
 */
export function createGroqProvider(groqApiKey: string) {
  return createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: groqApiKey,
  });
}