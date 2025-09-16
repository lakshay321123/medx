"use client";

const LOCK_KEY = "so-bg-leader-lock";
const LAST_KEY = "so-last-predict-at";
const INTERVAL_MS = 60_000;
const MIN_GAP_MS = 30 * 60_000;

function isLeader() {
  const now = Date.now();
  const n = Number(localStorage.getItem(LOCK_KEY) || 0);
  if (!n || now - n > 120000) {
    localStorage.setItem(LOCK_KEY, String(now));
    return true;
  }
  return false;
}

async function maybeRun() {
  if (process.env.NEXT_PUBLIC_SECOND_OPINION_BG_PREDICT === "off") return;
  if (!isLeader()) return;

  const last = Number(localStorage.getItem(LAST_KEY) || 0);
  const now = Date.now();
  if (now - last < MIN_GAP_MS) return;

  const userId = sessionStorage.getItem("user_id") || "default_user";
  const threadId = sessionStorage.getItem("aidoc_thread") || "default_thread";

  try {
    await fetch("/api/aidoc/predict", {
      method: "POST",
      body: JSON.stringify({ userId, threadId }),
    });
    localStorage.setItem(LAST_KEY, String(now));
  } catch {}
}

export default function PredictionHeartbeat() {
  if (typeof window === "undefined") return null;
  setTimeout(maybeRun, 1500);
  setInterval(maybeRun, INTERVAL_MS);
  return null;
}
