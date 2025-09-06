import { NextResponse } from "next/server";
import { flags } from "@/lib/flags";
import { ictrpInfoUrl } from "@/lib/trials_extras";

export async function GET() {
  if (!flags.enableTrialsICTRP) return NextResponse.json({ disabled: true });
  return NextResponse.json({ url: ictrpInfoUrl() });
}
