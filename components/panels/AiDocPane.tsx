"use client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatMarkdown from "@/components/ChatMarkdown";
import { useAidocStore } from "@/stores/useAidocStore";

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
  direction: "improving" | "worsening" | "flat" | "unknown";
  latest: TrendPoint | null;
  previous: TrendPoint | null;
  series: TrendPoint[];
};

const LABS_INTENT = /(report|reports|observation|observations|blood|lab|labs|lipid|cholesterol|ldl|hdl|triglycerides|a1c|hba1c|vitamin\s*d|crp|esr|uibc|lipase|date\s*wise|datewise|trend|changes?)/i;
const LDLHDL_INTENT = /(ldl|hdl|cholesterol)/i;

const fDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

const toTimestamp = (value?: string | null) => {
  if (!value) return -Infinity;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : -Infinity;
};

const describePointWithDate = (point?: TrendPoint | null, fallbackUnit?: string | null) => {
  if (!point || point.value == null) return null;
  const unit = point.unit ?? fallbackUnit ?? "";
  const unitPart = unit ? ` ${unit}` : "";
  const datePart = point.sample_date ? ` (${fDate(point.sample_date)})` : "";
  return `${point.value}${unitPart}${datePart}`;
};

const describeValue = (point?: TrendPoint | null, fallbackUnit?: string | null) => {
  if (!point || point.value == null) return "—";
  const unit = point.unit ?? fallbackUnit ?? "";
  const unitPart = unit ? ` ${unit}` : "";
  return `${point.value}${unitPart}`;
};

function seriesBlock(title: string, s?: TrendPoint[] | null, fallbackUnit?: string | null) {
  if (!s?.length) return `- **${title}**: _no values found_`;
  const lines = s
    .slice()
    .sort((a, b) => toTimestamp(b?.sample_date) - toTimestamp(a?.sample_date))
    .map(point => `  - ${fDate(point?.sample_date)}: ${describeValue(point, fallbackUnit)}`);
  return [`**${title}**`, ...lines].join("\n");
}

function labsSummaryMarkdown(trend: TrendItem[], meta?: any) {
  if (!trend?.length) return "I couldn’t find any structured lab values yet.";
  const head = meta ? `_source: ${meta.source} · tests: ${meta.kinds_seen} · points: ${meta.total_points}_\n\n` : "";
  return head + [
    "**Your latest labs (vs previous):**",
    ...trend.map(t => {
      const latest = describePointWithDate(t.latest, t.unit) ?? "—";
      const prev = describePointWithDate(t.previous, t.unit) ?? "no prior value to compare";
      const verdict = t.direction === "improving"
        ? "✅ Improving"
        : t.direction === "worsening"
          ? "⚠️ Worsening"
          : t.direction === "flat"
            ? "➖ No change"
            : "—";
      return `- **${t.test_name ?? t.test_code}**: ${latest} | Prev: ${prev} → ${verdict}`;
    }),
  ].join("\n");
}

function labsDatewiseMarkdown(trend: TrendItem[], meta?: any) {
  if (!trend?.length) return "I couldn’t find any structured lab values yet.";
  const head = meta ? `_source: ${meta.source} · tests: ${meta.kinds_seen} · points: ${meta.total_points}_\n\n` : "";
  const sections = trend.map(t => {
    const lines = t.series
      .slice()
      .sort((a, b) => toTimestamp(b?.sample_date) - toTimestamp(a?.sample_date))
      .map(point => `  - ${fDate(point?.sample_date)}: ${describeValue(point, t.unit)}`);
    const block = lines.length ? lines.join("\n") : "  - (no values recorded)";
    return [`- **${t.test_name ?? t.test_code}**`, block].join("\n");
  });
  return head + ["**Your labs by date (newest first):**", ...sections].join("\n");
}

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

    if (LABS_INTENT.test(text)) {
      try {
        const res = await fetch("/api/labs/summary");
        const body = await res.json().catch(() => null);
        if (body?.ok && Array.isArray(body.trend)) {
          const wantsDatewise = /(date ?wise|by date|chronolog)/i.test(text);
          if (LDLHDL_INTENT.test(text)) {
            const ldl = (body.trend as TrendItem[]).find(t => t.test_code === "LDL-C");
            const hdl = (body.trend as TrendItem[]).find(t => t.test_code === "HDL-C");
            const md = [
              `_source: ${body.meta?.source ?? "observations"}_`,
              "",
              seriesBlock(ldl?.test_name ?? "LDL Cholesterol", ldl?.series ?? [], ldl?.unit ?? null),
              "",
              seriesBlock(hdl?.test_name ?? "HDL Cholesterol", hdl?.series ?? [], hdl?.unit ?? null),
            ].join("\n");
            appendMessage({ id: uid(), role: "assistant", content: md });
          } else {
            const content = wantsDatewise
              ? labsDatewiseMarkdown(body.trend as TrendItem[], body.meta)
              : labsSummaryMarkdown(body.trend as TrendItem[], body.meta);
            appendMessage({ id: uid(), role: "assistant", content });
          }
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
