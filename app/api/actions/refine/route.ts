import { NextResponse } from "next/server";

interface RefineParams { action: string; messageId: string }

async function refineAnalysis({ action, messageId }: RefineParams) {
  // TODO: implement refine logic based on `action` and `messageId`
  return { id: crypto.randomUUID(), report: "", category: undefined };
}

export async function POST(req: Request) {
  try {
    const { action, messageId } = await req.json();
    if (!action || !messageId) {
      return NextResponse.json({ error: "Missing action or messageId" }, { status: 400 });
    }

    const result = await refineAnalysis({ action, messageId });

    return NextResponse.json({
      id: result.id ?? crypto.randomUUID(),
      report: result.report ?? "",
      category: result.category,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Refine action failed" },
      { status: 500 }
    );
  }
}
