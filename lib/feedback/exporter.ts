import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase/admin";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileFromPath } from "openai/uploads";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type FeedbackRow = {
  id: string;
  conversation_id: string;
  message_id: string;
  rating: number;          // 1 | -1
  note: string | null;
  mode: string | null;
  model: string | null;
  created_at: string;
};

export async function exportPendingFeedbackToOpenAI(limit = 500) {
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("ai_feedback")
    .select("*")
    .eq("pending_upload", true)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return { uploaded: 0, fileId: null };
  }

  // Build JSONL lines. You can extend schema later (e.g., include prompt/response refs).
  const lines = data.map((r: FeedbackRow) =>
    JSON.stringify({
      conversation_id: r.conversation_id,
      message_id: r.message_id,
      rating: r.rating,
      note: r.note,
      mode: r.mode,
      model: r.model,
      created_at: r.created_at,
    })
  ).join("\n");

  const tmpDir = os.tmpdir();
  const fname = `medx_feedback_${Date.now()}.jsonl`;
  const fpath = path.join(tmpDir, fname);
  fs.writeFileSync(fpath, lines);

  const file = await openai.files.create({
    file: await fileFromPath(fpath),
    purpose: "fine-tune", // use later for evals/fine-tuning
  });

  // Mark uploaded
  const ids = data.map((d: any) => d.id);
  await db
    .from("ai_feedback")
    .update({ pending_upload: false, uploaded_file_id: file.id })
    .in("id", ids);

  try { fs.unlinkSync(fpath); } catch {}

  return { uploaded: data.length, fileId: file.id };
}
