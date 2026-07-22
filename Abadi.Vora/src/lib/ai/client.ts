import OpenAI from "openai";
import type { AILocale } from "@/types/ai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!client) {
    client = new OpenAI({ apiKey: key });
  }
  return client;
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
export const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

export async function chatJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  locale: AILocale
): Promise<{ data: T; source: "openai" } | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\nRespond ONLY with valid JSON. Language for text fields: ${locale === "ar" ? "Arabic" : "English"}.`,
      },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  return { data: JSON.parse(content) as T, source: "openai" };
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return res.data[0]?.embedding ?? null;
}
