import { NextRequest, NextResponse } from 'next/server';
// [AIDOC_TRIAGE_IMPORT] add triage imports
import { handleDocAITriage, detectExperientialIntent } from "@/lib/aidoc/triage";
import { POST as streamPOST } from "../../chat/stream/route";
import { getUserId } from "@/lib/getUserId";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchLabSummary } from "@/lib/labs/summary";

export const runtime = 'nodejs';

// ---- Intent detection (deterministic; no LLM) ----
const PULL_RE     = /\b(pull|show|list|fetch)\s+(all\s+)?(my\s+)?report(s)?\b/i;
const COMPARE_RE  = /\b(compare|contrast)\s+(all\s+)?(my\s+)?report(s)?\b/i;
const OVERALL_RE  = /\b(how('?s|\s+is)\s+my\s+health(\s+overall)?|overall\s+health|health\s+overall)\b/i;
const METRIC_WORDS: Record<string,string[]> = {
  "LDL": ["ldl","ldl-c","low density lipoprotein"],
  "HbA1c": ["hba1c","a1c","glycated hemoglobin","glycosylated hemoglobin"],
  "ALT (SGPT)": ["alt","sgpt"],
  "AST (SGOT)": ["ast","sgot"],
  "HDL": ["hdl","hdl-c"],
  "Triglycerides": ["tg","triglycerides","triglyceride"],
  "Total Cholesterol": ["tc","total cholesterol","cholesterol total"],
  "Fasting Glucose": ["fbg","fasting glucose","fasting blood sugar"]
};
function detectMetric(text: string): string | null {
  const s = (text||"").toLowerCase();
  for (const [canon, aliases] of Object.entries(METRIC_WORDS)) {
    for (const a of aliases) if (s.includes(a)) return canon;
  }
  return null;
}
function detectAidocIntent(text: string):
  | { kind: "pull_reports" }
  | { kind: "compare_reports" }
  | { kind: "overall_health" }
  | { kind: "compare_metric"; metric: string }
  | { kind: "none" } {
  const s = (text||"").trim();
  if (!s) return { kind: "none" };
  if (PULL_RE.test(s)) return { kind: "pull_reports" };
  if (COMPARE_RE.test(s)) return { kind: "compare_reports" };
  if (OVERALL_RE.test(s)) return { kind: "overall_health" };
  if (/\bcompare\b/i.test(s)) {
    const m = detectMetric(s);
    if (m) return { kind: "compare_metric", metric: m };
  }
  return { kind: "none" };
}

// ---- Helpers for snapshot markdown (no UI dependency) ----
function canonName(name: string): string {
  const n = (name||"").toLowerCase();
  if (n === "ldl-c") return "LDL";
  if (n === "hdl-c") return "HDL";
  if (/^alt(\s|\()/.test(name)) return "ALT (SGPT)";
  if (/^ast(\s|\()/.test(name)) return "AST (SGOT)";
  if (/^tc$|total cholesterol/i.test(name)) return "Total Cholesterol";
  if (/^tg$|triglyceride/i.test(name)) return "Triglycerides";
  if (/^fbg$|fasting glucose|fasting blood sugar/i.test(name)) return "Fasting Glucose";
  return name;
}
type Hi = { name: string; value: number|string|null; unit: string|null; status: "high"|"low"|"normal"|"ok"|"unknown" };
function statusFor(v: number|null|undefined, lo?: number|null, hi?: number|null, polarity?: "lower"|"higher"|"neutral"): Hi["status"] {
  if (v==null) return "unknown";
  if (lo!=null && v < lo) return "low";
  if (hi!=null && v > hi) return "high";
  if (polarity === "higher") return "ok";
  return "normal";
}
function shortLine(highs: Hi[]): string {
  const get = (n:string)=> highs.find(h=>canonName(h.name)===n);
  const ldl = get("LDL"); const tc=get("Total Cholesterol");
  const alt = get("ALT (SGPT)"); const ast=get("AST (SGOT)");
  const fbg = get("Fasting Glucose");
  const bits:string[]=[];
  if (ldl?.status==="high" || tc?.status==="high") bits.push("Cholesterol high");
  if (alt?.status==="high" || ast?.status==="high") bits.push("liver enzymes high");
  if (fbg && (fbg.status==="normal"||fbg.status==="ok")) bits.push("glucose normal");
  if (!bits.length) bits.push("No strong signals");
  const line = bits.join("; ");
  return line.charAt(0).toUpperCase()+line.slice(1)+".";
}
function asMarkdownSnapshot(byDate: Record<string,Hi[]>) {
  const dates = Object.keys(byDate).sort().reverse();
  const lines:string[]=[];
  lines.push("## Patient Snapshot");
  if (dates.length) {
    const headline = shortLine(byDate[dates[0]]);
    lines.push(headline, "");
  }
  for (const d of dates) {
    const highs = byDate[d];
    const mini = shortLine(highs);
    lines.push(`**${d}** — ${mini}`);
    const chips = highs.slice(0,6).map(h => {
      const val = h.value==null ? "—" : String(h.value);
      const u = h.unit ? ` ${h.unit}` : "";
      return `\`${h.name}: ${val}${u} (${h.status})\``;
    }).join(" • ");
    if (chips) lines.push(chips);
    if (highs.length>6) lines.push(`_${highs.length-6} more_`);
    lines.push("");
  }
  lines.push("**What to do next**");
  lines.push("- Repeat any stale/missing key panels as advised by your clinician.");
  lines.push("- Discuss abnormal results and targets (e.g., LDL) with your clinician.");
  lines.push("- Keep steady activity and a fiber-forward diet for cardiometabolic support.");
  return lines.join("\n");
}
function asMarkdownMetric(metric: string, series: Array<{date:string; value:number|null; unit:string|null; status:string}>){
  const lines = [`## Compare ${metric}`];
  if (!series.length) {
    lines.push("_No values found yet. Add a report that includes this test._");
    return lines.join("\n");
  }
  for (const p of series) {
    const v = p.value==null ? "—" : String(p.value);
    const u = p.unit ? ` ${p.unit}` : "";
    lines.push(`- ${p.date} — **${v}${u}** (_${p.status}_)`);
  }
  if (series.length<2) lines.push("\n_Need ≥2 results to assess trend._");
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const message = (body?.message ?? body?.text ?? "").toString();
  const answers = (body?.answers && typeof body.answers === "object") ? body.answers : null;
  const incomingProfile = (body?.profile && typeof body.profile === "object") ? body.profile : null;
  const messages: Array<{ role: string; content: string }> = Array.isArray(body?.messages)
    ? [...body.messages]
    : [];
  const context = typeof body?.context === "string" ? body.context : undefined;
  const needsContextPacket = !!context && ["profile", "timeline", "ai-doc-med-profile"].includes(context);

  const userId = await getUserId(req);

  // ---- Early intercept for explicit report/compare intents (AI Doc only) ----
  const intent = detectAidocIntent(message);
  if (intent.kind !== "none") {
    if (!userId) return NextResponse.json({ role:"assistant", content: "Please sign in to view your reports." });
    try {
      const { points = [] } = await fetchLabSummary(supabaseAdmin(), { userId, limit: 365 });
      // group → dedupe per (document,test) then per-day, last write wins
      const byDate: Record<string, any[]> = {};
      for (const p of points) {
        const date = (p.taken_at || p.observed_at || p.takenAt || "").slice(0,10);
        if (!date) continue;
        (byDate[date] = byDate[date] || []).push(p);
      }
      const snapshotByDate: Record<string, Hi[]> = {};
      for (const [date, rows] of Object.entries(byDate)) {
        const seen = new Set<string>();
        // first cut: dedupe same test within same document/bundle
        const filtered = rows.filter((r:any)=>{
          const k = `${r.document_id||r.doc_id||"x"}:${r.test_code||r.test_name||r.name||"?"}`;
          if (seen.has(k)) return false; seen.add(k); return true;
        });
        // second cut: keep latest per canonical test within the day
        const per: Record<string, {h:Hi; ts:number}> = {};
        for (const r of filtered) {
          const nm = canonName(r.test_name || r.name || r.kind || "");
          const val = typeof r.value_num==="number" ? r.value_num : (r.value ?? null);
          const unit = r.unit ?? null;
          const lo = r.ref_low ?? r.refLow ?? null;
          const hi = r.ref_high ?? r.refHigh ?? null;
          const pol: "lower"|"higher"|"neutral" =
            /ldl|tc|triglyceride|tg|alt|ast|alp|crp|esr/i.test(nm) ? "lower" :
            /hdl/i.test(nm) ? "higher" : "neutral";
          const st = (lo!=null || hi!=null) ? statusFor(typeof val==="number"? val : null, lo, hi, pol) : "unknown";
          const ts = new Date(r.observed_at || r.taken_at || r.takenAt || date).getTime();
          if (!per[nm] || ts >= per[nm].ts) per[nm] = { h: { name:nm, value: val as any, unit, status: st }, ts };
        }
        snapshotByDate[date] = Object.values(per).map(x=>x.h);
      }

      if (intent.kind === "compare_metric") {
        const metric = intent.metric;
        const series: Array<{date:string; value:number|null; unit:string|null; status:string}> = [];
        Object.entries(snapshotByDate).forEach(([d, highs])=>{
          const h = highs.find(x => canonName(x.name) === metric);
          if (h) series.push({ date:d, value: (typeof h.value==="number"? h.value : null) as any, unit: h.unit, status: h.status });
        });
        series.sort((a,b)=> a.date.localeCompare(b.date));
        const md = asMarkdownMetric(metric, series);
        return NextResponse.json({ role: "assistant", content: md });
      }

      // pull/compare/overall → full snapshot markdown
      const md = asMarkdownSnapshot(snapshotByDate);
      return NextResponse.json({ role: "assistant", content: md });
    } catch (e) {
      // fall through to legacy stream on any error
    }
  }

  // ensure you have resolved the `profile` object here
  // profile = { name, age, sex, pregnant }
  let profile: any = null;
  let contextPacket: any = null;
  let observations: Array<{
    id: string;
    observed_at: string;
    kind: string;
    title: string | null;
    payload: unknown;
  }> = [];
  let labsPacket: any = null;
  try {
    if (userId) {
      const sb = supabaseAdmin();
      const { data: prof } = await sb
        .from("profiles")
        .select("full_name,dob,sex,blood_group,conditions_predisposition,chronic_conditions")
        .eq("id", userId)
        .maybeSingle();
      const obsResponse = needsContextPacket
        ? await sb
            .from("observations")
            .select("id, observed_at, kind, title, payload")
            .eq("user_id", userId)
            .order("observed_at", { ascending: false })
            .limit(50)
        : { data: null };
      try {
        const summary = await fetchLabSummary(sb, { userId, limit: 1000 });
        labsPacket = summary;
      } catch {}
      const obs = obsResponse.data;
      const dob = prof?.dob ? new Date(prof.dob) : null;
      const age = dob && !Number.isNaN(dob.getTime())
        ? Math.max(0, Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)))
        : undefined;
      profile = {
        name: prof?.full_name || undefined,
        age,
        sex: prof?.sex || undefined,
      };
      observations = Array.isArray(obs) ? obs : [];
      if (needsContextPacket) {
        const briefObs = observations.map((o) => ({
          id: o.id,
          when: o.observed_at,
          kind: o.kind,
          title: o.title,
          summary: typeof o.payload === "string" ? o.payload.slice(0, 800) : o.payload,
        }));
        contextPacket = {
          profile: {
            name: prof?.full_name,
            age,
            sex: prof?.sex,
            blood_group: prof?.blood_group,
            chronic_conditions: prof?.chronic_conditions,
            risk_predisposition: prof?.conditions_predisposition,
          },
          observations: briefObs,
        };
      }
    }
  } catch (err) {
    console.error("Failed to load profile for triage:", err);
    observations = [];
  }

  if (labsPacket !== null) {
    messages.unshift({
      role: "system",
      content: `If LABS are present, ground your answer in them:
<LABS>${JSON.stringify(labsPacket)}</LABS>
- "check my last blood report" → summarize latest per test_code.
- "pull all my reports & changes" → compare latest vs previous (Improving/Worsening/Flat).
- "see them date wise" → list date→value for each test, newest first.`
    });
  }

  const demoFromAnswers = (answers && typeof (answers as any).demographics === "object") ? (answers as any).demographics : null;
  const triageProfile = {
    name: (incomingProfile as any)?.name ?? profile?.name,
    age: (incomingProfile as any)?.age ?? profile?.age,
    sex: (incomingProfile as any)?.sex ?? profile?.sex,
    pregnant: (incomingProfile as any)?.pregnant ?? profile?.pregnant,
    ...(demoFromAnswers ?? {}),
  };

  // [AIDOC_TRIAGE_GUARD] intercept before streaming
  if (process.env.FEATURE_TRIAGE_V2 === "1" && message && detectExperientialIntent(message)) {
    try {
      const triage = await handleDocAITriage({
        text: message,
        profile: triageProfile,
        answers: (answers && typeof (answers as any).intake === "object") ? (answers as any).intake : answers,
      });

      if (triage.stage === "demographics") {
        return NextResponse.json({
          role: "assistant",
          stage: "demographics",
          prompt: "Hey—let’s get a couple basics first:",
          questions: triage.questions,
        });
      }
      if (triage.stage === "intake") {
        return NextResponse.json({
          role: "assistant",
          stage: "intake",
          prompt: "Hey, hang in there—I need a few quick details:",
          questions: triage.questions,
        });
      }
      return NextResponse.json({
        role: "assistant",
        stage: "advice",
        message: triage.message,
        soap: triage.soap,
      });
    } catch {
      // fall through to legacy stream
    }
  }

  // -------- Context Packet: profile + observations --------
  if (!contextPacket && needsContextPacket && profile) {
    const briefObs = observations.map((o) => ({
      id: o.id,
      when: o.observed_at,
      kind: o.kind,
      title: o.title,
      summary: typeof o.payload === "string" ? o.payload.slice(0, 800) : o.payload,
    }));
    contextPacket = {
      profile: {
        name: profile?.name,
        age: profile?.age,
        sex: profile?.sex,
      },
      observations: briefObs,
    };
  }

  const systemPreamble = {
    role: "system",
    content:
      "You are AI Doc. If a context packet is present, USE IT for clinical reasoning before asking for clarifications."
      + (contextPacket ? `\n\n<CONTEXT_PACKET>${JSON.stringify(contextPacket)}</CONTEXT_PACKET>` : ""),
  };
  const finalMessages = [systemPreamble, ...messages];
  const forwardBody = { ...body, messages: finalMessages };

  const headers = new Headers(req.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  const forwardReq = new NextRequest(req.url, {
    method: req.method,
    headers,
    body: JSON.stringify(forwardBody),
  });

  // existing streaming setup continues here
  return streamPOST(forwardReq);
}
