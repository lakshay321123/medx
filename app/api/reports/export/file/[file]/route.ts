import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: NextRequest, { params }: { params: { file: string } }) {
  const filePath = path.join("/tmp", params.file);
  try {
    const data = await fs.readFile(filePath, "utf8");
    return new NextResponse(data, {
      headers: { "Content-Type": "text/csv" }
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
