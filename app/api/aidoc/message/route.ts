import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payload = await req.json().catch(()=>({}));
  if (payload.op === "boot") {
    const has = cookies().get("aidoc_booted")?.value === "1";
    if (!has) {
      cookies().set("aidoc_booted","1",{ httpOnly:true, sameSite:"lax" });
      return NextResponse.json({ type:"greeting", text:"Hi — quick check on your meds…" });
    }
    return NextResponse.json({ ok:true });
  }
  return NextResponse.json({ ok:true });
}
