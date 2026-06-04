import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createGroqProvider } from "./ai-gateway.server";

const Input = z.object({
  submitted: z.unknown(),
  source_url: z.string().url(),
});

// JSON-serializable shape; use `any` to satisfy TanStack's serializability validator.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
type Change = { path: string; before: Json; after: Json; reason: string };
type ReviewResult = {
  corrected: Json;
  changes: Change[];
  source_title?: string;
  error?: string;
  raw?: string;
};

export const llmReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<ReviewResult> => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("Missing GROQ_API_KEY environment variable. Get one at https://console.groq.com");

    // 1. fetch the source page server-side
    let htmlText = "";
    let title = "";
    try {
      const res = await fetch(data.source_url, {
        headers: { "User-Agent": "XtriumValidator/1.0" },
      });
      const html = await res.text();
      title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
      htmlText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40_000);
    } catch (e) {
      return {
        corrected: data.submitted,
        changes: [],
        error: `Failed to fetch source URL: ${(e as Error).message}`,
      };
    }

    const gateway = createGroqProvider(key);
    // Use mixtral model (fast, high quality, free tier)
    const model = gateway("mixtral-8x7b-32768");

    const prompt = [
      "You are a meticulous data-QA reviewer.",
      "Compare the SUBMITTED_JSON to the SOURCE_HTML_TEXT extracted from the source webpage.",
      "Find spelling mistakes, missing fields, wrong values, or fabricated content.",
      "Return a STRICT JSON response (no markdown, no commentary) with this exact shape:",
      `{"corrected": <full corrected JSON keeping the original structure>, "changes": [{"path": "$.path.to.field", "before": <old>, "after": <new>, "reason": "..."}]}`,
      "",
      `SOURCE_URL: ${data.source_url}`,
      `SOURCE_TITLE: ${title}`,
      "",
      "SOURCE_HTML_TEXT (cleaned):",
      htmlText,
      "",
      "SUBMITTED_JSON:",
      JSON.stringify(data.submitted),
    ].join("\n");

    const { text } = await generateText({ model, prompt });

    // strip ```json fences if any
    const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return {
        corrected: parsed.corrected ?? data.submitted,
        changes: parsed.changes ?? [],
        source_title: title,
      };
    } catch {
      return {
        corrected: data.submitted,
        changes: [],
        error: "LLM did not return valid JSON",
        raw: text.slice(0, 2000),
      };
    }
  });