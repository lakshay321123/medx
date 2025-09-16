export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/getUserId";

// Accept either uploadId (preferred) OR bucket+path directly
export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const supa = supabaseAdmin();
  const url = new URL(req.url);
  const uploadId = url.searchParams.get("uploadId");
  const bucketQ = url.searchParams.get("bucket");
  const pathQ = url.searchParams.get("path");

  // start with what we were given
  let b: string | null = bucketQ || null;
  let p: string | null = pathQ ? pathQ.replace(/^\/+/, "") : null; // strip leading "/"
  let name: string | null = null;
  let mime: string | null = null;

  if (uploadId) {
    const up = await supa
      .from("uploads")
      .select("bucket,path,name,mime")
      .eq("id", uploadId)
      .maybeSingle();
    if (!up.error && up.data) {
      b = b || up.data.bucket || "uploads";
      p = p || (up.data.path ? String(up.data.path).replace(/^\/+/, "") : null);
      name = up.data.name || null;
      mime = up.data.mime || null;
    }
  }

  // If we still don't have a bucket but p looks like "bucket/inner/path", split it.
  if (!b && p && /^([^/]+)\/.+/.test(p)) {
    const idx = p.indexOf("/");
    b = p.slice(0, idx);
    p = p.slice(idx + 1);
  }

  if (!b || !p) {
    return NextResponse.json(
      { url: null },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  const signed = await supa.storage.from(b).createSignedUrl(p, 600);
  if (signed.error || !signed.data?.signedUrl) {
    console.warn("[signed-url]", signed.error?.message || signed.error);
    return NextResponse.json(
      { url: null },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { url: signed.data.signedUrl, name, mime, bucket: b, path: p },
    { headers: { "Cache-Control": "no-store" } }
  );
}
