import { NextResponse } from "next/server";

const FEATURE_ENABLED =
  process.env.FEATURE_DIRECTORY === "1" || process.env.NEXT_PUBLIC_FEATURE_DIRECTORY === "1";

type FlagBody = {
  placeId?: string;
  reason?: string;
};

export async function POST(request: Request) {
  if (!FEATURE_ENABLED) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  let body: FlagBody = {};
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.placeId) {
    return NextResponse.json({ error: "missing_place" }, { status: 400 });
  }

  console.info("directory_flag", {
    placeId: body.placeId,
    reason: body.reason ?? "",
    ts: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
