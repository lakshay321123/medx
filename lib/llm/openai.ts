import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Centralized model registry (overridable via env)
export const MODELS = {
  SMART: process.env.MODEL_SMART || "gpt-5",
  BALANCED: process.env.MODEL_BALANCED || "gpt-4.1",
  FAST: process.env.MODEL_FAST || "gpt-4o-mini",
} as const;

export type Tier = "smart" | "balanced" | "fast";

export function modelFor(tier: Tier = "smart") {
  switch (tier) {
    case "fast": return MODELS.FAST;
    case "balanced": return MODELS.BALANCED;
    default: return MODELS.SMART;
  }
}

