import { NextResponse } from "next/server";
import { getJob } from "@/lib/server/jobStore";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ status: "error", errorText: "Missing job" });
  }
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ status: "error", errorText: "Network error" });
  }
  if (job.status === "done") {
    const payload = job.payload ?? {};
    const responseText =
      job.responseText ??
      (typeof payload?.text === "string"
        ? payload.text
        : typeof payload?.reply === "string"
        ? payload.reply
        : "");
    return NextResponse.json({ status: "done", payload, responseText });
  }
  if (job.status === "error") {
    return NextResponse.json({ status: "error", errorText: job.errorText ?? "Network error", payload: job.payload });
  }
  return NextResponse.json({ status: "running" });
}
