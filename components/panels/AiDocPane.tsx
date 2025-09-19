"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatMarkdown from "@/components/ChatMarkdown";
import { useAidocStore } from "@/stores/useAidocStore";
import {
  LABS_INTENT_REGEX,
  RAW_TEXT_REGEX,
  canonicalForCode,
  detectLabsInText,
} from "@/lib/labs/codes";

function uid() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

type TrendPoint = {
  value: number | null;
  unit: string | null;
  sample_date: string | null;
};

type TrendItem = {
  test_code: string;
  test_name: string;
  unit: string | null;
  better: "lower" | "higher" | null;
  direction: "improving" | "worsening" | "flat" | "unknown";
  latest: TrendPoint | null;
  previous: TrendPoint | null;
  series: TrendPoint[];
};

const fDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

const formatValue = (point?: TrendPoint | null, fallbackUnit?: string | null) => {
  if (!point || point.value == null) return "—";
  const unit = point.unit ?? fallbackUnit ?? "";
  return unit ? `${point.value} ${unit}` : `${point.value}`;
};

const formatValueWithDate = (point?: TrendPoint | null, fallbackUnit?: string | null) => {
  if (!point || point.value == null) return null;
  const value = formatValue(point, fallbackUnit);
  return point.sample_date ? `${value} (${fDate(point.sample_date)})` : value;
};

const toDateKey = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const sameDay = (sampleDate?: string | null, key?: string | null) => {
  if (!sampleDate || !key) return false;
  return toDateKey(sampleDate) === key;
};

const diffDaysFromNow = (sampleDate?: string | null) => {
  if (!sampleDate) return null;
  const d = new Date(sampleDate);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

const verdictLabel = (direction: TrendItem["direction"]) => {
  switch (direction) {
    case "improving":
      return "✅ Improving";
    case "worsening":
      return "⚠️ Worsening";
    case "flat":
      return "➖ No change";
    default:
      return "—";
  }
};

const metaBanner = (meta?: { source?: string; points?: number }) => {
  if (!meta) return "";
  const bits = [] as string[];
  if (meta.source) bits.push(meta.source);
  if (typeof meta.points === "number") bits.push(`${meta.points} points`);
  return bits.length ? `_${bits.join(" · ")}_\n\n` : "";
};

const filterTrendByCodes = (trend: TrendItem[], codes: string[]) => {
  if (!codes.length) return trend;
  const wanted = new Set(codes.map(code => code.toUpperCase()));
  return trend.filter(item => wanted.has(item.test_code.toUpperCase()));
};

const labsSummaryMarkdown = (trend: TrendItem[], meta?: { source?: string; points?: number }) => {
  if (!trend?.length) return "I couldn’t find any structured lab values yet.";
  const head = metaBanner(meta);
  const body = trend.map(t => {
    const latest = formatValueWithDate(t.latest, t.unit) ?? "—";
    const prev = formatValueWithDate(t.previous, t.unit) ?? "no prior value to compare";
    return `- **${t.test_name ?? t.test_code}**: ${latest} | Prev: ${prev} → ${verdictLabel(t.direction)}`;
  });
  return head + ["**Your latest labs (vs previous):**", ...body].join("\n");
};

const labsDatewiseMarkdown = (trend: TrendItem[], meta?: { source?: string; points?: number }) => {
  if (!trend?.length) return "I couldn’t find any structured lab values yet.";
  const groups = new Map<string, { label: string; entries: string[] }>();
  for (const item of trend) {
    for (const point of item.series) {
      if (!point || point.value == null) continue;
      const key = toDateKey(point.sample_date);
      if (!key) continue;
      const label = fDate(`${key}T00:00:00Z`);
      if (!groups.has(key)) {
        groups.set(key, { label, entries: [] });
      }
      groups.get(key)!.entries.push(`  - ${item.test_name ?? item.test_code}: ${formatValue(point, item.unit)}`);
    }
  }
  const orderedKeys = Array.from(groups.keys()).sort((a, b) => (a > b ? -1 : 1));
  if (!orderedKeys.length) return "I couldn’t find any structured lab values yet.";
  const head = metaBanner(meta);
  const sections = orderedKeys.map(key => {
    const group = groups.get(key)!;
    return [`- ${group.label}`, ...group.entries].join("\n");
  });
  return head + ["**Your labs by date (newest first):**", ...sections].join("\n");
};

const labsComparisonMarkdown = (trend: TrendItem[], meta?: { source?: string; points?: number }) => {
  if (!trend?.length) return "I couldn’t find any structured lab values yet.";
  const head = metaBanner(meta);
  const rows = trend.map(t => {
    const latest = formatValueWithDate(t.latest, t.unit) ?? "—";
    const prev = formatValueWithDate(t.previous, t.unit) ?? "no prior value to compare";
    return `- **${t.test_name ?? t.test_code}**: ${latest} | Prev: ${prev} → ${verdictLabel(t.direction)}`;
  });

  const improving = trend.filter(t => t.direction === "improving");
  const worsening = trend.filter(t => t.direction === "worsening");
  const flat = trend.filter(t => t.direction === "flat");

  const summaryParts: string[] = [];
  if (improving.length) summaryParts.push(`Improving: ${improving.map(t => t.test_name ?? t.test_code).join(", ")}.`);
  if (worsening.length) summaryParts.push(`Needs attention: ${worsening.map(t => t.test_name ?? t.test_code).join(", ")}.`);
  if (flat.length) summaryParts.push(`Holding steady: ${flat.map(t => t.test_name ?? t.test_code).join(", ")}.`);
  if (!summaryParts.length) summaryParts.push("No clear trend yet—need more readings.");

  return head + ["**What’s changed:**", ...rows, "", summaryParts.join(" ")].join("\n");
};

type DateRequest = { key: string; label: string };
type SpecificRequests = {
  date?: DateRequest;
  highest?: boolean;
  lowest?: boolean;
  recency?: boolean;
};

const labsSpecificMarkdown = (
  trend: TrendItem[],
  meta: { source?: string; points?: number } | undefined,
  requests: SpecificRequests,
  tests: string[],
) => {
  const filtered = filterTrendByCodes(trend, tests);
  if (!filtered.length) {
    if (tests.length) {
      const names = tests
        .map(code => canonicalForCode(code)?.name ?? code)
        .join(", ");
      return `I couldn’t find structured values for ${names} yet.`;
    }
    return "I couldn’t find any structured lab values yet.";
  }

  const head = metaBanner(meta);
  const lines: string[] = [];

  if (requests.date) {
    const matches: string[] = [];
    const missing: string[] = [];
    for (const item of filtered) {
      const point = item.series.find(p => sameDay(p.sample_date, requests.date?.key));
      if (point && point.value != null) {
        matches.push(`- **${item.test_name ?? item.test_code} (${requests.date.label})**: ${formatValue(point, item.unit)}`);
      } else {
        missing.push(item.test_name ?? item.test_code);
      }
    }
    if (matches.length) lines.push(...matches);
    if (missing.length) lines.push(`- No readings for ${missing.join(", ")} on ${requests.date.label}.`);
    if (!matches.length && !missing.length) {
      lines.push(`- I couldn’t find labs recorded on ${requests.date.label}.`);
    }
  }

  if (requests.highest) {
    for (const item of filtered) {
      const best = [...item.series].filter(p => p.value != null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
      if (best && best.value != null) {
        lines.push(`- **Highest ${item.test_name ?? item.test_code}**: ${formatValueWithDate(best, item.unit) ?? "—"}`);
      } else {
        lines.push(`- **Highest ${item.test_name ?? item.test_code}**: no readings yet.`);
      }
    }
  }

  if (requests.lowest) {
    for (const item of filtered) {
      const lowest = [...item.series].filter(p => p.value != null).sort((a, b) => (a.value ?? 0) - (b.value ?? 0))[0];
      if (lowest && lowest.value != null) {
        lines.push(`- **Lowest ${item.test_name ?? item.test_code}**: ${formatValueWithDate(lowest, item.unit) ?? "—"}`);
      } else {
        lines.push(`- **Lowest ${item.test_name ?? item.test_code}**: no readings yet.`);
      }
    }
  }

  if (requests.recency) {
    for (const item of filtered) {
      const latest = item.latest;
      if (latest?.sample_date) {
        const days = diffDaysFromNow(latest.sample_date);
        const when = days == null
          ? fDate(latest.sample_date)
          : days === 0
            ? `today (${fDate(latest.sample_date)})`
            : `${days} day${days === 1 ? "" : "s"} ago (${fDate(latest.sample_date)})`;
        lines.push(`- **${item.test_name ?? item.test_code}**: last measured ${when}.`);
      } else {
        lines.push(`- **${item.test_name ?? item.test_code}**: no measurements yet.`);
      }
    }
  }

  if (!lines.length) {
    lines.push("- I didn’t detect a specific value to report yet.");
  }

  return head + ["**Lab details:**", ...lines].join("\n");
};

type LabsMode = "snapshot" | "datewise" | "comparison" | "specific";

type LabsPromptDetails = {
  mode: LabsMode;
  tests: string[];
  range: { from?: string; to?: string } | null;
  requests: SpecificRequests;
};

const DATEWISE_REGEX = /(date\s*wise|by date|chronolog|timeline|pull (?:all|up).*(?:reports|labs)|see (?:them|my )?(?:reports|labs).*date|all (?:my )?(?:reports|labs))/i;
const COMPARISON_REGEX = /(what changed|changes?|trend|improv|worsen|better|worse|compare|progress)/i;
const RECENCY_REGEX = /(days since|last measured|how long since|when was (?:my )?(?:last )?)/i;
const HIGHEST_REGEX = /(highest|max(imum)?|peak)/i;
const LOWEST_REGEX = /(lowest|min(imum)?|drop)/i;

const parseLabsPrompt = (text: string): LabsPromptDetails => {
  const tests = detectLabsInText(text);
  const range = extractRelativeRange(text);
  const requests = parseSpecificRequests(text);

  let mode: LabsMode = "snapshot";
  if (hasSpecificRequest(requests)) {
    mode = "specific";
  } else if (COMPARISON_REGEX.test(text)) {
    mode = "comparison";
  } else if (DATEWISE_REGEX.test(text)) {
    mode = "datewise";
  }

  return { mode, tests, range, requests };
};

const hasSpecificRequest = (requests: SpecificRequests) =>
  Boolean(requests.date || requests.highest || requests.lowest || requests.recency);

const extractRelativeRange = (text: string): { from?: string; to?: string } | null => {
  const match = text.match(/(last|past)\s+(?:the\s+)?(\d+)?\s*(day|days|week|weeks|month|months|year|years)/i);
  if (!match) return null;
  const count = Number(match[2] ?? "1");
  const unit = match[3].toLowerCase();
  const now = new Date();
  const end = new Date(now.getTime());
  const start = new Date(now.getTime());

  switch (unit) {
    case "day":
    case "days":
      start.setDate(start.getDate() - count);
      break;
    case "week":
    case "weeks":
      start.setDate(start.getDate() - count * 7);
      break;
    case "month":
    case "months":
      start.setMonth(start.getMonth() - count);
      break;
    case "year":
    case "years":
      start.setFullYear(start.getFullYear() - count);
      break;
    default:
      break;
  }

  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);
  return { from, to };
};

const parseSpecificRequests = (text: string): SpecificRequests => {
  const lowered = text.toLowerCase();
  const date = extractDateFromText(text);
  return {
    date: date ?? undefined,
    highest: HIGHEST_REGEX.test(lowered) || undefined,
    lowest: LOWEST_REGEX.test(lowered) || undefined,
    recency: RECENCY_REGEX.test(lowered) || undefined,
  };
};

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const extractDateFromText = (text: string): DateRequest | null => {
  const cleaned = text.replace(/(\d+)(st|nd|rd|th)/gi, "$1");

  const isoMatch = cleaned.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) {
    const key = isoMatch[0];
    return { key, label: labelForKey(key) };
  }

  const numericMatch = cleaned.match(/\b\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}\b/);
  if (numericMatch) {
    const key = parseNumericDate(numericMatch[0]);
    if (key) return { key, label: labelForKey(key) };
  }

  const monthFirst = cleaned.match(
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}(?:,?\s*\d{2,4})?\b/i,
  );
  if (monthFirst) {
    const key = parseMonthDate(monthFirst[0], false);
    if (key) return { key, label: labelForKey(key) };
  }

  const dayMonth = cleaned.match(
    /\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+\d{2,4})?\b/i,
  );
  if (dayMonth) {
    const key = parseMonthDate(dayMonth[0], true);
    if (key) return { key, label: labelForKey(key) };
  }

  return null;
};

const labelForKey = (key: string) => {
  const date = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString();
};

const parseNumericDate = (value: string): string | null => {
  const parts = value.split(/[\/-]/).map(v => Number(v));
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;

  let year: number;
  let month: number;
  let day: number;

  if (parts[0] > 31) {
    // yyyy-mm-dd or yyyy/mm/dd
    [year, month, day] = parts;
  } else {
    let first = parts[0];
    let second = parts[1];
    let third = parts[2];
    if (third < 100) third += 2000;
    if (value.match(/^\d{2,2}[\/-]\d{2,2}[\/-]\d{4}$/) && first > 12 && second <= 12) {
      day = first;
      month = second;
      year = third;
    } else {
      month = first;
      day = second;
      year = third;
    }
  }

  if (year < 100) year += 2000;
  return isoFromParts(year, month, day);
};

const parseMonthDate = (value: string, dayFirst: boolean): string | null => {
  const tokens = value.replace(/[,]/g, " ").trim().split(/\s+/);
  if (tokens.length < 2) return null;
  const lowerTokens = tokens.map(t => t.toLowerCase());
  let day: number | undefined;
  let monthName: string | undefined;
  let year: number | undefined;

  if (dayFirst) {
    day = Number(lowerTokens[0]);
    monthName = lowerTokens[1];
    year = lowerTokens[2] ? Number(lowerTokens[2]) : undefined;
  } else {
    monthName = lowerTokens[0];
    day = Number(lowerTokens[1]);
    year = lowerTokens[2] ? Number(lowerTokens[2]) : undefined;
  }

  if (!monthName || Number.isNaN(day!)) return null;
  const monthIndex = MONTH_NAMES.findIndex(name => monthName!.startsWith(name.slice(0, 3)));
  if (monthIndex < 0) return null;
  const fullYear = year == null || Number.isNaN(year) ? new Date().getFullYear() : year < 100 ? year + 2000 : year;
  return isoFromParts(fullYear, monthIndex + 1, day!);
};

const isoFromParts = (year: number, month: number, day: number): string | null => {
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

export default function AiDocPane() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = searchParams.get("threadId");
  const resetForThread = useAidocStore(s => s.resetForThread);
  const messages = useAidocStore(s => s.messages);
  const appendMessage = useAidocStore(s => s.appendMessage);
  const updateMessage = useAidocStore(s => s.updateMessage);
  const removeMessage = useAidocStore(s => s.removeMessage);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) {
      const saved = sessionStorage.getItem("aidoc_thread");
      if (saved) {
        router.push(`?panel=ai-doc&threadId=${saved}&context=profile`);
      } else {
        const id = `aidoc_${Date.now().toString(36)}`;
        sessionStorage.setItem("aidoc_thread", id);
        router.push(`?panel=ai-doc&threadId=${id}&context=profile`);
      }
    }
  }, [threadId, router]);

  useEffect(() => {
    if (!threadId) return;
    resetForThread(threadId);
    if (sessionStorage.getItem("aidoc_booted")) return;
    sessionStorage.setItem("aidoc_booted", "1");
    (async () => {
      try {
        const res = await fetch("/api/aidoc/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, op: "boot" }),
        });
        const body = await res.json().catch(() => null);
        if (body?.messages && Array.isArray(body.messages)) {
          body.messages.forEach((m: any) => {
            if (m?.content) {
              appendMessage({ id: uid(), role: m.role || "assistant", content: m.content });
            }
          });
        } else if (body?.text) {
          appendMessage({ id: uid(), role: "assistant", content: body.text });
        }
      } catch {}
    })();
  }, [threadId, resetForThread, appendMessage]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0 && !!threadId && !isSending, [input, threadId, isSending]);

  const handleSend = async (evt?: FormEvent) => {
    evt?.preventDefault();
    const text = input.trim();
    if (!text || !threadId || isSending) return;
    setInput("");
    setIsSending(true);

    const existing = useAidocStore.getState().messages.filter(m => !m.pending);
    const userMessage = { id: uid(), role: "user" as const, content: text };
    appendMessage(userMessage);

    if (LABS_INTENT_REGEX.test(text)) {
      if (RAW_TEXT_REGEX.test(text)) {
        appendMessage({
          id: uid(),
          role: "assistant",
          content: "I can show your structured values here—open the Timeline to view the raw report text if you need the OCR copy.",
        });
        setIsSending(false);
        return;
      }

      try {
        const details = parseLabsPrompt(text);
        const params = new URLSearchParams();
        if (details.tests.length) params.set("tests", details.tests.join(","));
        if (details.range?.from) params.set("from", details.range.from);
        if (details.range?.to) params.set("to", details.range.to);
        const query = params.toString();
        const res = await fetch(`/api/labs/summary${query ? `?${query}` : ""}`);
        const body = await res.json().catch(() => null);
        if (body?.ok && Array.isArray(body.trend)) {
          const trend = filterTrendByCodes(body.trend as TrendItem[], details.tests);
          const meta = body.meta as { source?: string; points?: number } | undefined;
          let content: string;

          switch (details.mode) {
            case "datewise":
              content = labsDatewiseMarkdown(trend, meta);
              break;
            case "comparison":
              content = labsComparisonMarkdown(trend, meta);
              break;
            case "specific":
              content = labsSpecificMarkdown(trend, meta, details.requests, details.tests);
              break;
            case "snapshot":
            default:
              content = labsSummaryMarkdown(trend, meta);
              break;
          }

          appendMessage({ id: uid(), role: "assistant", content });
        } else {
          appendMessage({
            id: uid(),
            role: "assistant",
            content: "I couldn’t access your structured labs just now.",
          });
        }
      } catch {
        appendMessage({
          id: uid(),
          role: "assistant",
          content: "I hit an error fetching your labs.",
        });
      }
      setIsSending(false);
      return;
    }

    const pendingId = uid();
    appendMessage({ id: pendingId, role: "assistant", content: "", pending: true });

    const history = [
      ...existing.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    try {
      const res = await fetch("/api/aidoc/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          message: text,
          threadId,
          context: "ai-doc-med-profile",
          mode: "patient",
        }),
      });
      if (res.status === 409) {
        removeMessage(pendingId);
        setIsSending(false);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`Chat API error ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(line => line.startsWith("data: "));
        for (const line of lines) {
          if (line.trim() === "data: [DONE]") continue;
          try {
            const payload = JSON.parse(line.replace(/^data:\s*/, ""));
            const delta = payload?.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              updateMessage(pendingId, { content: acc });
            }
          } catch {}
        }
      }
      const finalContent = acc.trim() ? acc : "⚠️ Sorry, I couldn’t generate a response.";
      updateMessage(pendingId, { content: finalContent, pending: false });
    } catch (err) {
      console.error(err);
      updateMessage(pendingId, {
        content: "⚠️ Sorry, something went wrong.",
        pending: false,
        error: err instanceof Error ? err.message : String(err ?? "error"),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <p className="text-sm opacity-70">Start by telling AI Doc what’s going on.</p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50"
              }`}
            >
              {msg.role === "assistant" ? (
                msg.content ? (
                  <ChatMarkdown content={msg.content} />
                ) : (
                  <span className="opacity-60">…</span>
                )
              ) : (
                <span>{msg.content}</span>
              )}
              {msg.error && (
                <div className="mt-2 text-xs opacity-70">{msg.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex gap-3">
          <textarea
            className="min-h-[48px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Describe your symptoms or ask about your labs…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={evt => {
              if (evt.key === "Enter" && !evt.shiftKey) {
                evt.preventDefault();
                void handleSend();
              }
            }}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
