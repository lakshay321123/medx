import { upsertProfileMemory } from "./store";

export async function detectAndApplyUpdates(threadId: string, text: string) {
  const t = text.toLowerCase();
  // weight updates e.g., "weight 80", "i'm 82 kg now"
  const kg = t.match(/(?:weight|weigh|wt)\s*[:=]?\s*(\d{2,3})\s?kg/) || t.match(/(\d{2,3})\s?kg\s?(?:now|today)?/);
  if (kg) {
    await upsertProfileMemory(threadId, "weight", `${parseInt(kg[1],10)} kg`);
  }
  // height examples (simple)
  const cm = t.match(/(\d{3})\s?cm/);
  if (cm) {
    await upsertProfileMemory(threadId, "height", `${parseInt(cm[1],10)} cm`);
  }
  // diet type updates
  if (/\bnon[-\s]?veg\b|chicken|fish|egg/.test(t)) await upsertProfileMemory(threadId, "diet", "non-veg");
  else if (/\bveg\b/.test(t)) await upsertProfileMemory(threadId, "diet", "veg");
}

