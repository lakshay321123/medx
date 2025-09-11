import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ON = (k: string) => (process.env[k] || "").toLowerCase() === "true";
const featureOn = () => ON("AI_HEALTH_COACH");
const DEF_LANG = process.env.COACH_DEFAULT_LANG || "en";

const FALLBACK_TIP = "Stay active today.";

const TIPS = [
  "Take a short walk today to keep active.",
  "Stay hydrated—drink a glass of water now.",
  "Choose a fruit for a healthy snack.",
];

function hash(str: string) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

async function generateTip(key: string) {
  if (process.env.COACH_FORCE_ERROR === "1") throw new Error("forced");
  const idx = Math.abs(hash(key)) % TIPS.length;
  return TIPS[idx];
}

function getStore() {
  const g = globalThis as any;
  if (!g.__coachTips) g.__coachTips = new Map();
  return g.__coachTips as Map<string, string>;
}

function fallbackTip() {
  return FALLBACK_TIP;
}

export async function GET(req: NextRequest) {
  if (!featureOn()) return NextResponse.json({ error: "disabled" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const lang = searchParams.get("lang") || DEF_LANG;
  const userId = req.headers.get("x-user-id") || "anon";
  const today = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${today}:${lang}`;

  const store = getStore();
  let tip = store.get(key);
  let generated = false;

  if (!tip) {
    try {
      tip = await generateTip(key);
      generated = true;
    } catch {
      tip = fallbackTip();
    }
    store.set(key, tip);
  }

  console.log(JSON.stringify({ user_id: userId, generated }));
  return NextResponse.json({ date: today, lang, tip });
}
