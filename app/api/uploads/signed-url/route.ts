export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

// Accept either uploadId (preferred) OR bucket+path directly
export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const uploadId = url.searchParams.get("uploadId");
  const bucket = url.searchParams.get("bucket");
  const path = url.searchParams.get("path");

  const supa = supabaseAdmin();

  let b = bucket, p = path, name: string | null = null, mime: string | null = null;

  try {
    if (uploadId) {
      // Try to look up from 'uploads' table if your schema has it
      const up = await supa
        .from("uploads")
        .select("*")
        .eq("id", uploadId)
        .maybeSingle();
      if (!up.error && up.data) {
        b = b || up.data.bucket || "uploads";
        p = p || up.data.path;
        name = up.data.name || null;
        mime = up.data.mime || null;
      }
    }
    // Derive bucket/path if storage_path like "bucket/path/to/file.pdf"
    if (!p && path) {
      const m = path.match(/^([^/]+)\/(.+)$/);
      if (m) {
        b = m[1];
        p = m[2];
      }
    }
    if (!b || !p) {
      return NextResponse.json(
        { error: "Missing bucket/path for signed URL" },
        { status: 400 }
      );
    }
    const storage = supa.storage.from(b);
    const signed = await storage.createSignedUrl(p, 60 * 10); // 10 minutes
    if (signed.error) throw signed.error;
    return NextResponse.json(
      { url: signed.data.signedUrl, name, mime, bucket: b, path: p },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
