import { NextRequest, NextResponse } from "next/server";
import { explainLabTest } from "@/lib/labExplainers";

export async function POST(req: NextRequest) {
  if (process.env.LAB_TEST_EXPLAINERS !== "true") {
    return NextResponse.json({ disabled: true });
  }
  const { testName } = await req.json();
  if (!testName) {
    return NextResponse.json({ error: "testName required" }, { status: 400 });
  }
  const expl = explainLabTest(String(testName));
  if (!expl) {
    return NextResponse.json({
      labExplainer: {
        name: String(testName),
        message: "not available. please provide panel context.",
      },
    });
  }
  return NextResponse.json({ labExplainer: expl });
}
