'use client';
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useMemo, RefObject, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { fromSearchParams } from '@/lib/modes/url';
import Header from '../Header';
import { useRouter } from 'next/navigation';
import ChatMarkdown from '@/components/ChatMarkdown';
import ResearchFilters from '@/components/ResearchFilters';
import { LinkBadge } from '@/components/SafeLink';
import TrialsTable from "@/components/TrialsTable";
import type { TrialRow } from "@/types/trials";
import { useResearchFilters } from '@/store/researchFilters';
import { Send, Paperclip, Clipboard, Stethoscope, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useCountry } from '@/lib/country';
import { getRandomWelcome } from '@/lib/welcomeMessages';
import { useActiveContext } from '@/lib/context';
import { isFollowUp } from '@/lib/followup';
import { detectFollowupIntent } from '@/lib/intents';
import { BRAND_NAME } from "@/lib/brand";
import SuggestionChips from "@/components/chat/SuggestionChips";
import SuggestBar from "@/components/suggest/SuggestBar";
import ComposerFocus from "@/components/chat/ComposerFocus";
import { normalizeSuggestions } from "@/lib/chat/normalize";
import type { Suggestion } from "@/lib/chat/suggestions";
import { getDefaultSuggestions, getInlineSuggestions } from "@/lib/suggestions/engine";
import { safeJson } from '@/lib/safeJson';
import { splitFollowUps } from '@/lib/splitFollowUps';
import { getTrials } from "@/lib/hooks/useTrials";
import { patientTrialsPrompt, clinicianTrialsPrompt } from "@/lib/prompts/trials";
import FeedbackBar from "@/components/FeedbackBar";
import type { ChatMessage as BaseChatMessage } from "@/types/chat";
import type { AnalysisCategory } from '@/lib/context';
import { ensureThread, loadMessages, saveMessages, generateTitle, updateThreadTitle, upsertThreadIndex, createNewThreadId } from '@/lib/chatThreads';
import { useMemoryStore } from "@/lib/memory/useMemoryStore";
import { summarizeTrials } from "@/lib/research/summarizeTrials";
import { computeTrialStats, type TrialStats } from "@/lib/research/trialStats";
import { detectSocialIntent } from "@/lib/social";
import { pushFullMem, buildFullContext } from "@/lib/memory/shortTerm";
import { maybeIndexStructured } from "@/lib/memory/structured";
import { detectAdvancedDomain } from "@/lib/intents/advanced";
// === ADD-ONLY for domain routing ===
import { detectDomain } from "@/lib/intents/domains";
import * as DomainStyles from "@/lib/prompts/domains";
import { AnalyzingInline } from "@/components/chat/AnalyzingInline";
import ScrollToBottom from "@/components/ui/ScrollToBottom";
import { StopButton } from "@/components/ui/StopButton";
import { pushAssistantToChat } from "@/lib/chat/pushAssistantToChat";
import { getUserPosition, fetchNearby, geocodeArea, type NearbyKind, type NearbyPlace } from "@/lib/nearby";
import { formatTrialBriefMarkdown } from "@/lib/trials/brief";
import { useIsAiDocMode } from "@/hooks/useIsAiDocMode";

const ChatSuggestions = dynamic(() => import("./ChatSuggestions"), { ssr: false });

const AIDOC_UI = process.env.NEXT_PUBLIC_AIDOC_UI === '1';
const AIDOC_PREFLIGHT = process.env.NEXT_PUBLIC_AIDOC_PREFLIGHT === '1';

const NEARBY_DEFAULT_RADIUS_KM = 2;
const NEARBY_RADIUS_CHOICES = [1, 2, 3, 5, 8, 10] as const;
const NEARBY_EXPAND_SEQUENCE = [2, 5, 8, 10];
const NEARBY_SESSION_TTL_MS = 30 * 60 * 1000;
const NEARBY_CHUNK_SIZE = 5;
const PINCODE_RE = /\b\d{5,6}\b/;
const NEARBY_CONFIRM_RE = /\b(yes|ok|okay|sure|go ahead|proceed|haan|haanji)\b/i;
const NEARBY_EXPAND_RE = /\b(expand|wider|broaden|increase range)\b/i;
const NEARBY_RADIUS_RE = /(\d+(?:\.\d+)?)\s*(km|kms|kilometers|kilometres|m|meter|meters)\b/i;
const NEARBY_LOCATION_REFRESH_RE = /\b(near me|use my location|refresh location)\b/i;
const NEARBY_SHOW_MORE_RE = /\b(show more|next)\b/i;
const NEARBY_PREVIOUS_RE = /\b(previous|back)\b/i;
const NEARBY_DIRECTIONS_RE = /\b(?:directions|navigate)\s*#?(\d{1,2})\b/i;
const NEARBY_CALL_RE = /\bcall\s*#?(\d{1,2})\b/i;
const NEARBY_OPEN_NOW_RE = /\b(open now|24\/?7|24x7|24-7)\b/i;
const NEARBY_CHANGE_CATEGORY_RE = /\b(change category|different (?:type|category)|another (?:category|type))\b/i;
const NEARBY_NEAR_WORD_RE = /\b(near|nearby|around|close to|within)\b/i;

const NO_LABS_MESSAGE = "I couldn't find structured lab values yet.";
const REPORTS_LOCKED_MESSAGE = "Reports are available only in AI Doc mode.";
const LABS_INTENT = /(report|reports|observation|observations|blood|lab|labs|lipid|cholesterol|ldl|hdl|triglycerides|a1c|hba1c|vitamin\s*d|crp|esr|uibc|tibc|creatinine|egfr|urea|bilirubin|ast|alt|sgot|sgpt|ggt|alkaline|alp|date\s*wise|datewise|trend|changes?)/i;
const RAW_TEXT_INTENT = /(raw text|full text|show .*report text)/i;

const formatTrendDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

const trendLineFor = (t: any) => {
  const unit = t?.unit ? ` ${t.unit}` : "";
  const formatPoint = (point?: { value: number; sample_date: string } | null) =>
    point && typeof point.value === "number"
      ? `${point.value}${unit} (${formatTrendDate(point.sample_date)})`
      : "—";
  const verdict =
    t?.direction === "improving"
      ? "✅ Improving"
      : t?.direction === "worsening"
      ? "⚠️ Worsening"
      : t?.direction === "flat"
      ? "➖ No change"
      : "—";
  return `- **${t?.test_name ?? t?.test_code ?? "Test"}**: ${formatPoint(t?.latest)} | Prev: ${formatPoint(t?.previous)} → ${verdict}`;
};

const buildTrendLines = (trend: any[]): string[] => {
  if (!Array.isArray(trend)) return [];
  return trend.map(trendLineFor);
};

const NEARBY_KIND_SYNONYMS: Record<NearbyKind, string[]> = {
  pharmacy: [
    "pharmacy",
    "pharmacies",
    "chemist",
    "chemists",
    "medical store",
    "medical stores",
    "medicine shop",
    "medicine shops",
    "medical shop",
    "medical shops",
    "24x7",
    "24/7",
  ],
  doctor: [
    "doctor",
    "doctors",
    "gp",
    "g.p.",
    "physician",
    "physicians",
    "dentist",
    "dentists",
    "pediatrician",
    "pediatricians",
    "paediatrician",
    "gyn",
    "gynecologist",
    "gynecologists",
    "gynaecologist",
    "gynaecologists",
    "ortho",
    "orthopedic",
    "orthopedics",
    "orthopaedic",
    "ent",
    "derma",
    "dermatologist",
    "dermatologists",
    "general practitioner",
    "family doctor",
    "physio",
    "physiotherapist",
  ],
  clinic: [
    "clinic",
    "clinics",
    "polyclinic",
    "polyclinics",
  ],
  hospital: [
    "hospital",
    "hospitals",
    "nursing home",
    "nursing homes",
    "emergency",
    "urgent care",
    "trauma center",
    "trauma centre",
  ],
  lab: [
    "lab",
    "labs",
    "laboratory",
    "laboratories",
    "pathology",
    "diagnostics",
    "diagnostic centre",
    "diagnostic center",
    "blood test",
    "blood tests",
    "radiology",
    "x-ray",
    "xray",
    "mri",
    "ct",
  ],
};

const NEARBY_LABELS: Record<NearbyKind, { singular: string; plural: string }> = {
  pharmacy: { singular: "pharmacy", plural: "pharmacies" },
  doctor: { singular: "doctor", plural: "doctors" },
  clinic: { singular: "clinic", plural: "clinics" },
  hospital: { singular: "hospital", plural: "hospitals" },
  lab: { singular: "lab", plural: "labs" },
};

const NEARBY_RADIUS_CHIPS = "1 km · 3 km · 5 km · 8 km · 10 km · Change category · Refresh location";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const NEARBY_SYNONYM_PATTERNS = Object.entries(NEARBY_KIND_SYNONYMS)
  .flatMap(([kind, items]) =>
    items.map((term) => ({
      kind: kind as NearbyKind,
      term,
      regex: new RegExp(`\\b${escapeRegExp(term).replace(/\\s+/g, "\\s+")}\\b`, "i"),
    })),
  )
  .sort((a, b) => b.term.length - a.term.length);

function detectNearbyKindFromText(text: string, fallback?: NearbyKind): NearbyKind | null {
  const match = NEARBY_SYNONYM_PATTERNS.find(({ regex }) => regex.test(text));
  if (match) return match.kind;
  return fallback ?? null;
}

function hasNearbyKeyword(text: string) {
  return NEARBY_NEAR_WORD_RE.test(text) || PINCODE_RE.test(text) || NEARBY_LOCATION_REFRESH_RE.test(text);
}

function extractAreaFromText(text: string): string | null {
  const areaMatch = text.match(/\b(?:near|around|in|at|close to)\s+(?!me\b)([A-Za-z0-9,\-\s]{3,})/i);
  if (!areaMatch) return null;
  const cleaned = areaMatch[1].replace(/\b(?:here|there|nearby)\b/gi, "").trim();
  if (!cleaned || cleaned.toLowerCase() === "me") return null;
  return cleaned.replace(/[?.!]+$/, "").trim();
}

function parseRadiusMatch(match: RegExpExecArray | null): number | null {
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = match[2].toLowerCase();
  const km = unit.startsWith("m") && !unit.startsWith("mi") ? value / 1000 : value;
  return km;
}

function normalizeRadiusKm(km: number): number {
  const clamped = Math.min(Math.max(km, 0.5), NEARBY_RADIUS_CHOICES[NEARBY_RADIUS_CHOICES.length - 1]);
  let best: (typeof NEARBY_RADIUS_CHOICES)[number] = NEARBY_RADIUS_CHOICES[0];
  let bestDiff = Math.abs(clamped - best);
  for (const candidate of NEARBY_RADIUS_CHOICES) {
    const diff = Math.abs(clamped - candidate);
    if (diff < bestDiff) {
      best = candidate;
      bestDiff = diff;
    }
  }
  return best;
}

function nextExpandRadius(current: number) {
  for (const candidate of NEARBY_EXPAND_SEQUENCE) {
    if (candidate > current) return candidate;
  }
  return current;
}

function formatDistanceKm(distanceMeters?: number) {
  if (!Number.isFinite(distanceMeters)) return "";
  const km = distanceMeters! / 1000;
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.max(1, Math.round(distanceMeters!))} m`;
}

function formatNearbyCards(results: NearbyPlace[], start: number, count: number) {
  return results.slice(start, start + count).map((place, index) => {
    const absoluteIndex = start + index + 1;
    const distance = formatDistanceKm(place.distance_m);
    const header = distance ? `${absoluteIndex}. ${place.name} — ${distance}` : `${absoluteIndex}. ${place.name}`;
    const lines = [header];
    if (place.address) {
      lines.push(place.address);
    }
    if (place.opening_hours) {
      lines.push(`🕒 Hours: ${place.opening_hours}`);
    }
    const mapsUrl = `https://www.google.com/maps?q=${place.lat},${place.lon}`;
    const directions = `🧭 Directions: ${mapsUrl} | ${place.osm_url}`;
    if (place.phone) {
      lines.push(`📞 Call: ${place.phone}`);
    }
    lines.push(directions);
    if (place.website) {
      lines.push(`🌐 Website: ${place.website}`);
    }
    return lines.join("\n");
  }).join("\n\n");
}

function radiusLabel(km: number) {
  return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
}

// Control how social intent behaves:
//  - 'off'    : completely disabled
//  - 'silent' : acts on yes/no but DOES NOT print canned lines (default)
//  - 'chatty' : old behavior (prints canned lines)
const SOCIAL_MODE: 'off' | 'silent' | 'chatty' = 'silent';

type SendOpts = { visualEcho?: boolean; clientRequestId?: string };
let inFlight = false;

async function computeEval(expr: string) {
  const r = await fetch("/api/compute/math", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ op:"eval", expr }) });
  const j = await r.json(); if (!j.ok) throw new Error(j.error||"compute failed"); return j.out as string;
}

type ChatUiState = {
  topic: string | null;
  contextFrom: string | null; // e.g., 'Conversation summary'
};

const UI_DEFAULTS: ChatUiState = { topic: null, contextFrom: null };
const uiKey = (threadId: string) => `chat:${threadId}:ui`;

type NearbySessionState = {
  kind: NearbyKind;
  lat: number;
  lon: number;
  radiusKm: number;
  ts: number;
  lastResults: NearbyPlace[];
  lastResultsEmpty: boolean;
  nextIndex: number;
  chunkSize: number;
  lastAction?: "nearby";
  locationLabel?: string;
  attribution?: string;
};

type ChatMessage =
  | (BaseChatMessage & {
      role: "user";
      kind: "chat";
      tempId?: string;
      parentId?: string;
      pending?: boolean;
      error?: string | null;
    })
  | (BaseChatMessage & {
      role: "assistant";
      kind: "chat";
      tempId?: string;
      parentId?: string;
      pending?: boolean;
      error?: string | null;
    })
  | (BaseChatMessage & {
      role: "assistant";
      kind: "analysis";
      category?: AnalysisCategory;
      tempId?: string;
      parentId?: string;
      pending?: boolean;
      error?: string | null;
    });

const uid = () => Math.random().toString(36).slice(2);

function getLastAnalysis(list: ChatMessage[]) {
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (m.role === "assistant" && m.kind === "analysis" && !m.pending && !m.error) return m;
  }
}

function replaceFirstPendingWith(list: ChatMessage[], finalMsg: ChatMessage) {
  const copy = [...list];
  const idx = copy.findIndex(m => m.pending);
  if (idx >= 0) copy[idx] = finalMsg;
  return copy;
}

function titleForCategory(c?: AnalysisCategory) {
  switch (c) {
    case "xray":
      return "Imaging Report";
    case "lab_report":
      return "Lab Report Summary";
    case "prescription":
      return "Prescription Summary";
    case "discharge_summary":
      return "Discharge Summary";
    default:
      return "Medical Document Summary";
  }
}

function isNewTopic(text: string) {
  if (detectSocialIntent(text)) return false;
  const q = text.trim();
  return (
    /\b[a-z][a-z\s-]{1,40}\b/i.test(q) &&
    !/\b(what|how|why|best|top|latest|near|which|who|when)\b/i.test(q) &&
    q.split(/\s+/).length <= 3
  );
}
function inferTopicFromDoc(report: string) {
  const h1 = (report.match(/^#\s*(.+)$/m) || [, ""])[1];
  const hits = report.match(/\b(cancer|fracture|pneumonia|diabetes|hypertension|asthma|arthritis|kidney|liver|anemia)\b/i);
  return h1 && h1.length <= 40 ? h1 : hits?.[0] || "medical report";
}

function maybeFixMedicalTypo(s: string) {
  // super conservative: only single-word queries, simple known misspellings
  const map: Record<string,string> = {
    leujimkea: "leukemia",
    leujemia: "leukemia",
    leucemia: "leukemia"
    // add more safely as needed
  };
  const oneWord = s.trim().toLowerCase();
  if (/^[a-z-]{4,}$/.test(oneWord) && map[oneWord]) {
    return { corrected: map[oneWord], ask: `Did you mean **${map[oneWord]}**? (Yes/No)` };
  }
  return null;
}

function buildMedicinesPrompt(topic: string, country: { code3: string; name: string }) {
  const system = `You are ${BRAND_NAME}. Provide medicine options for the topic below.
TOPIC: ${topic}
User country: ${country.code3} (${country.name}). Prefer local OTC examples; if unsure, use generic names and say availability varies.
Safety: do not prescribe; advise to confirm with a clinician; contraindications only if well-established.`.trim();
  const user = "Best medicines for this condition.";
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

function buildHospitalsPrompt(topic: string, country: { code2: string; code3: string; name: string }) {
  const system = `You are ${BRAND_NAME}. List top hospitals/centres in ${country.name} that treat: ${topic}.
Prefer nationally recognized or government/teaching institutions.
Provide city + short note. Output 5–10 items max.`.trim();
  const user = "Top hospitals for this condition.";
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

function buildTrialsPrompt(topic: string, country: { code3: string; name: string }) {
  const system = `You are ${BRAND_NAME}. Summarize the latest clinical trial directions for: ${topic}.
If exact current trials are needed, direct users to authoritative registries (e.g., ClinicalTrials.gov, WHO ICTRP; for India: CTRI).
No fabricated IDs. Provide themes, not specific trial numbers unless confident.`.trim();
  const user = `Latest clinical trials for ${topic} (brief overview).`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

function PendingAnalysisCard({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 text-left whitespace-normal max-w-3xl">
      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <AnalyzingInline active={!!active} />
      </div>
    </div>
  );
}

function PendingChatCard({ label, active }: { label: string; active?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 text-left whitespace-normal max-w-3xl">
      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <AnalyzingInline active={!!active} />
      </div>
    </div>
  );
}

function AnalysisCard({
  m,
  researchOn,
  onQuickAction,
  busy,
  pendingTimerActive
}: {
  m: Extract<ChatMessage, { kind: "analysis" }>;
  researchOn: boolean;
  onQuickAction: (k: "simpler" | "doctor" | "next") => void;
  busy: boolean;
  pendingTimerActive?: boolean;
}) {
  const header = titleForCategory(m.category);
  if (m.pending) return <PendingAnalysisCard label="Analyzing file…" active={pendingTimerActive} />;
  return (
    <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 text-left whitespace-normal max-w-3xl space-y-2">
      <header className="flex items-center gap-2">
        <h2 className="text-lg md:text-xl font-semibold">{header}</h2>
        {researchOn && (
          <span className="ml-auto text-xs rounded-full px-2 py-0.5 bg-indigo-100 text-indigo-900 border border-indigo-200/60 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800">
            Research Mode
          </span>
        )}
      </header>
      <ChatMarkdown content={m.content} />
      {m.error && (
        <div className="inline-flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800">
          ⚠️ {m.error}
        </div>
      )}
      {!m.error && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy}
            onClick={() => onQuickAction("simpler")}
          >
            Explain simpler
          </button>
          <button
            type="button"
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy}
            onClick={() => onQuickAction("doctor")}
          >
            Doctor’s view
          </button>
          <button
            type="button"
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={busy}
            onClick={() => onQuickAction("next")}
          >
            What next?
          </button>
        </div>
      )}
      <p className="text-xs text-amber-500/90 pt-2">
        AI assistance only — not a medical diagnosis. Confirm with a clinician.
      </p>
    </div>
  );
}
function ChatCard({
  m,
  therapyMode,
  onAction,
  simple,
  pendingTimerActive
}: {
  m: Extract<ChatMessage, { kind: "chat" }>;
  therapyMode: boolean;
  onAction: (s: Suggestion) => void;
  simple: boolean;
  pendingTimerActive?: boolean;
}) {
  const suggestions = normalizeSuggestions(m.followUps);
  if (m.pending) return <PendingChatCard label="Thinking…" active={pendingTimerActive} />;
  return (
    <div
      className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 text-left whitespace-normal max-w-3xl"
    >
      <ChatMarkdown content={m.content} />
      {m.role === "assistant" && (m.citations?.length || 0) > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(m.citations || []).slice(0, simple ? 3 : 6).map((c, i) => (
            <LinkBadge key={i} href={c.url}>
              {c.source.toUpperCase()}
              {c.extra?.evidenceLevel ? ` · ${c.extra.evidenceLevel}` : ""}
            </LinkBadge>
          ))}
        </div>
      )}
      {!therapyMode && suggestions.length > 0 && (
        <SuggestionChips suggestions={suggestions} onAction={onAction} />
      )}
    </div>
  );
}

function AssistantMessage({
  m,
  researchOn,
  onQuickAction,
  busy,
  therapyMode,
  onAction,
  simple,
  pendingTimerActive
}: {
  m: ChatMessage;
  researchOn: boolean;
  onQuickAction: (k: "simpler" | "doctor" | "next") => void;
  busy: boolean;
  therapyMode: boolean;
  onAction: (s: Suggestion) => void;
  simple: boolean;
  pendingTimerActive?: boolean;
}) {
  return m.kind === "analysis" ? (
    <AnalysisCard
      m={m}
      researchOn={researchOn}
      onQuickAction={onQuickAction}
      busy={busy}
      pendingTimerActive={pendingTimerActive}
    />
  ) : (
    <ChatCard
      m={m as Extract<ChatMessage, { kind: "chat" }>}
      therapyMode={therapyMode}
      onAction={onAction}
      simple={simple}
      pendingTimerActive={pendingTimerActive}
    />
  );
}

export default function ChatPane({ inputRef: externalInputRef }: { inputRef?: RefObject<HTMLInputElement> } = {}) {

  const { country } = useCountry();
  const { active, setFromAnalysis, setFromChat, clear: clearContext } = useActiveContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userText, setUserText] = useState('');
  const [mounted, setMounted] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [proactive, setProactive] = useState<null | { kind: 'predispositions'|'medications'|'weight' }>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | null>(null);
  const [loadingAction, setLoadingAction] = useState<null | 'simpler' | 'doctor' | 'next'>(null);
  const [labSummary, setLabSummary] = useState<any | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef =
    (externalInputRef as unknown as RefObject<HTMLTextAreaElement>) ??
    (useRef<HTMLTextAreaElement>(null) as RefObject<HTMLTextAreaElement>);
  const { filters } = useResearchFilters();

  const sp = useSearchParams();
  const isAiDocMode = useIsAiDocMode();
  const modeState = useMemo(() => fromSearchParams(sp, 'light'), [sp]);
  const mode: 'patient' | 'doctor' = modeState.base === 'doctor' ? 'doctor' : 'patient';
  const researchMode = modeState.research;
  const therapyMode = modeState.therapy;
  const defaultSuggestions = useMemo(() => getDefaultSuggestions(modeState), [modeState]);
  const liveSuggestions = useMemo(() => getInlineSuggestions(userText, modeState), [userText, modeState]);
  const visibleMessages = useMemo(
    () => messages.filter(m => m.role === 'user' || m.role === 'assistant'),
    [messages]
  );
  const trimmedInput = userText.trim();
  const isTyping = trimmedInput.length > 0;
  const showDefaultSuggestions = visibleMessages.length === 0 && !isTyping;
  const showLiveSuggestions = inputFocused && isTyping && liveSuggestions.length > 0;
  const showSuggestions = mounted && inputFocused && !isTyping;

  const lastSuggestions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'assistant') {
        return normalizeSuggestions(m.followUps);
      }
    }
    return [];
  }, [messages]);

  const handleSuggestionPick = (text: string) => {
    setUserText(text);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLabSummary = useCallback(async () => {
    if (!isAiDocMode) return;
    try {
      const res = await fetch('/api/labs/summary?mode=ai-doc');
      const body = await res.json();
      if (body?.ok) setLabSummary(body);
    } catch (e) {
      console.error('labs summary error', e);
    }
  }, [isAiDocMode]);

  useEffect(() => {
    if (!AIDOC_UI || !isAiDocMode) return;
    fetchLabSummary();
  }, [isAiDocMode, fetchLabSummary]);

  useEffect(() => {
    if (!AIDOC_UI || !isAiDocMode) return;
    const handler = () => fetchLabSummary();
    window.addEventListener('observations-updated', handler);
    return () => window.removeEventListener('observations-updated', handler);
  }, [isAiDocMode, fetchLabSummary]);

  const addAssistant = (text: string, opts?: Partial<ChatMessage>) =>
    setMessages(prev => [
      ...prev,
      { id: uid(), role: 'assistant', kind: 'chat', content: text, ...opts } as any,
    ]);
  const pushAssistantText = (text: string, opts?: Partial<ChatMessage>) =>
    addAssistant(text, opts);

  const buildReportTimelineCard = useCallback(async () => {
    if (!isAiDocMode) return REPORTS_LOCKED_MESSAGE;
    try {
      const response = await fetch('/api/labs/summary?mode=ai-doc');
      const body: any = await response.json();
      if (!body?.ok) return "Couldn’t load structured labs.";

      setLabSummary(body);

      const trend: any[] = Array.isArray(body.trend) ? body.trend : [];
      const dayMap = new Map<string, { date: Date; items: string[] }>();
      for (const t of trend) {
        const series = Array.isArray(t?.series) ? t.series : [];
        for (const p of series) {
          if (!p?.sample_date) continue;
          const d = new Date(p.sample_date);
          if (Number.isNaN(d.getTime())) continue;
          const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
          const name = t?.test_name ?? t?.test_code ?? 'Test';
          const unit = t?.unit ? ` ${t.unit}` : '';
          const existing = dayMap.get(key);
          if (existing) {
            existing.items.push(`${name}: ${p.value}${unit}`);
          } else {
            dayMap.set(key, { date: d, items: [`${name}: ${p.value}${unit}`] });
          }
        }
      }

      const days = Array.from(dayMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
      const totalReports =
        typeof body.meta?.total_reports === 'number' ? body.meta.total_reports : days.length;

      let md = `**Report Timeline**\n\nHere are your reports, sorted by date:\n\n`;
      if (days.length === 0) {
        md += `${NO_LABS_MESSAGE}`;
      } else {
        for (const group of days) {
          md += `- **${group.date.toLocaleDateString()}**: ${group.items.join(' • ')}\n`;
        }
      }
      md += `\n**Total documents:** ${totalReports}`;
      return md;
    } catch (err) {
      console.error('labs timeline error', err);
      return "Couldn’t load structured labs.";
    }
  }, [isAiDocMode, setLabSummary]);

  const showOcrText = useCallback(async () => {
    pushAssistantText('Raw report text is currently only available from the document view.');
  }, [pushAssistantText]);

  // Auto-resize the textarea up to a max height
  useEffect(() => {
    const el = (inputRef?.current as unknown as HTMLTextAreaElement | null);
    if (!el) return;
    el.style.height = 'auto';
    const max = 200; // px; ~ChatGPT feel
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
  }, [userText, inputRef]);

  const [aidoc, setAidoc] = useState<any | null>(null);
  const [loadingAidoc, setLoadingAidoc] = useState(false);
  const [showPatientChooser, setShowPatientChooser] = useState(false);
  const [showNewIntake, setShowNewIntake] = useState(false);
  const [intake, setIntake] = useState({
    name: "", age: "", sex: "female", pregnant: "", symptoms: "", meds: "", allergies: ""
  });
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const topAlerts = Array.isArray(aidoc?.softAlerts) ? aidoc.softAlerts : [];
  const planAlerts = Array.isArray(aidoc?.plan?.softAlerts)
    ? aidoc.plan.softAlerts
    : [];
  const softAlerts = Array.from(new Set([...topAlerts, ...planAlerts]));

  useEffect(() => {
    if (isAiDocMode) return;
    setAidoc(null);
    setLabSummary(null);
  }, [isAiDocMode]);

  useEffect(() => {
    if (!AIDOC_UI || !isAiDocMode) return;
    if (!aidoc) return;
    fetchLabSummary();
  }, [aidoc, fetchLabSummary, isAiDocMode]);

  const [trialRows, setTrialRows] = useState<TrialRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [stats, setStats] = useState<TrialStats | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { enabled, rememberThisThread, autoSave, pushSuggestion, setLastSaved } = useMemoryStore();

  function handleTrials(rows: TrialRow[]) {
    setTrialRows(rows);
    setSearched(true);

    // summarize trials for quick overview
    const s = summarizeTrials(rows as any, mode === "doctor" ? "doctor" : "patient");
    setSummary(s);
    setStats(computeTrialStats(rows as any));
    setShowDetails(false); // collapse on new search
  }

  const router = useRouter(); // auto-new-thread
  const threadId = sp.get('threadId');
  const context = sp.get('context');
  // ADD: stable fallback thread key for default chat
  const stableThreadId = threadId || 'default-thread';
  const isProfileThread = threadId === 'med-profile' || context === 'profile';
  const conversationId =
    threadId ||
    (isProfileThread
      ? 'med-profile'
      : (typeof window !== 'undefined'
          ? ((window as any).__medxEphemeralId ||= crypto.randomUUID())
          : 'ephemeral'));

  // Auto-create a fresh thread when landing on /?panel=chat with no threadId
  useEffect(() => {
    if (!threadId && !isProfileThread) {
      const id = createNewThreadId();
      const params = new URLSearchParams(sp.toString());
      params.set("panel", "chat");
      params.set("threadId", id);
      router.replace(`/?${params.toString()}`);
    }
  }, [threadId, isProfileThread, router, sp]);
  const currentMode: 'patient'|'doctor'|'research'|'therapy' = therapyMode ? 'therapy' : (researchMode ? 'research' : mode);
  const [pendingCommitIds, setPendingCommitIds] = useState<string[]>([]);
  const [commitBusy, setCommitBusy] = useState<null | 'save' | 'discard'>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const posted = useRef(new Set<string>());
  const nearbySessions = useRef<Map<string, NearbySessionState>>(new Map());
  const bootedRef = useRef<{[k:string]:boolean}>({});
  const askedKey = (thread?: string|null, kind?: string)=> `aidoc:${thread||'med-profile'}:asked:${kind||'any'}`;
  const askedRecently = (thread?: string|null, kind?: string, minutes = 60) => {
    try {
      const v = localStorage.getItem(askedKey(thread, kind));
      if (!v) return false;
      const ts = Number(v);
      return Number.isFinite(ts) && (Date.now() - ts) < minutes*60*1000;
    } catch { return false; }
  };
  const markAskedNow = (thread?: string|null, kind?: string) => {
    try { localStorage.setItem(askedKey(thread, kind), String(Date.now())); } catch {}
  };

  const [ui, setUi] = useState<ChatUiState>(UI_DEFAULTS);
  const lastUserMessageText = useMemo(() => {
    const arr = messages.slice().reverse();
    const m = arr.find(m => m?.role === 'user' && typeof m?.content === 'string');
    return (m?.content || '').trim();
  }, [messages]);
  const activeProfileName = activeProfile?.full_name || activeProfile?.name || 'current patient';
  const activeProfileId = activeProfile?.id || null;

  const labSummaryCard = useMemo(() => {
    if (!labSummary?.ok) return null;
    const trend = Array.isArray(labSummary.trend) ? labSummary.trend : [];
    const days = new Set<string>();
    let latestDateValue: Date | null = null;
    for (const t of trend) {
      const series = Array.isArray(t?.series) ? t.series : [];
      for (const p of series) {
        if (!p?.sample_date) continue;
        const d = new Date(p.sample_date);
        if (Number.isNaN(d.getTime())) continue;
        const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
        days.add(dayKey);
        if (!latestDateValue || d > latestDateValue) {
          latestDateValue = d;
        }
      }
    }
    const totalReports =
      (labSummary.meta && typeof labSummary.meta.total_reports === 'number'
        ? labSummary.meta.total_reports
        : undefined) ?? days.size;
    const latestDate = latestDateValue ? latestDateValue.toLocaleDateString() : '—';
    const lines = [
      '**Medical Records Summary**',
      `- **Reports:** ${totalReports} (distinct dates)`,
      `- **Latest report:** ${latestDate}`,
    ];
    const trendLines = buildTrendLines(trend);
    if (trendLines.length > 0) {
      lines.push('', ...trendLines);
    } else {
      lines.push('', NO_LABS_MESSAGE);
    }
    return lines.join('\n');
  }, [labSummary]);

  const nearbySessionKey = () => threadId || `${mode}-default`;

  const getNearbySession = (key: string) => {
    const existing = nearbySessions.current.get(key);
    if (!existing) return undefined;
    if (Date.now() - existing.ts > NEARBY_SESSION_TTL_MS) {
      nearbySessions.current.delete(key);
      return undefined;
    }
    return existing;
  };

  const setNearbySession = (key: string, session: NearbySessionState) => {
    nearbySessions.current.set(key, {
      ...session,
      ts: Date.now(),
      lastResults: [...session.lastResults],
    });
  };

  const emitNearbyResults = (
    session: NearbySessionState,
    start: number,
    count: number,
    options?: { prefix?: string; includeChips?: boolean; note?: string },
  ) => {
    if (!session.lastResults.length) {
      pushAssistantText('No nearby results saved yet. Try searching again.');
      return;
    }

    const safeStart = Math.max(0, start);
    const available = session.lastResults.length;
    const actualCount = Math.min(count, Math.max(0, available - safeStart));
    if (actualCount <= 0) {
      pushAssistantText('No more places to show. Try widening the radius or changing the category.');
      return;
    }

    const locationHint = session.locationLabel ? ` of ${session.locationLabel}` : '';
    const defaultPrefix =
      safeStart === 0
        ? `Here are nearby ${NEARBY_LABELS[session.kind].plural} within ${radiusLabel(session.radiusKm)}${locationHint}.`
        : `More ${NEARBY_LABELS[session.kind].plural}:`;
    let message = `${options?.prefix ?? defaultPrefix}\n\n${formatNearbyCards(session.lastResults, safeStart, actualCount)}`;

    if (available > safeStart + actualCount) {
      message += `\n\nSay "show more" to see additional places.`;
    }
    if (safeStart > 0) {
      message += `\n\nSay "previous" to go back.`;
    }
    if (options?.note) {
      message += `\n\n${options.note}`;
    }
    if (options?.includeChips !== false) {
      message += `\n\n${NEARBY_RADIUS_CHIPS}`;
    }
    if (session.attribution) {
      message += `\n\n${session.attribution}`;
    }

    pushAssistantText(message);
  };

  const ensureChunkSize = (session: NearbySessionState) => session.chunkSize || NEARBY_CHUNK_SIZE;

  const fetchAndRenderNearby = async (key: string, session: NearbySessionState) => {
    const radiusMeters = Math.round(session.radiusKm * 1000);
    const response = await fetchNearby(session.kind, session.lat, session.lon, radiusMeters);
    const attribution = response.attribution || session.attribution;

    if (response.error === "service_busy") {
      const updated: NearbySessionState = {
        ...session,
        attribution,
        lastAction: session.lastAction ?? "nearby",
      };
      setNearbySession(key, updated);
      pushAssistantText('Nearby service is busy right now. Please try again in a moment.');
      if (updated.lastResults.length) {
        emitNearbyResults(updated, 0, Math.min(updated.lastResults.length, ensureChunkSize(updated)), {
          prefix: `Reusing the last ${NEARBY_LABELS[updated.kind].plural}:`,
        });
      }
      return true;
    }

    if (response.error && !response.results.length) {
      pushAssistantText('Sorry — could not fetch nearby places right now. Please try again shortly.');
      return true;
    }

    if (!response.results.length) {
      const nextRadius = nextExpandRadius(session.radiusKm);
      const suggestion =
        nextRadius > session.radiusKm
          ? `You can say "expand" to widen to ${radiusLabel(nextRadius)}.`
          : 'Try another category such as pharmacies, clinics, hospitals, or labs.';
      const locationHint = session.locationLabel ? ` of ${session.locationLabel}` : '';
      const note = `No ${NEARBY_LABELS[session.kind].plural} within ${radiusLabel(session.radiusKm)}${locationHint}. ${suggestion}`;
      const updated: NearbySessionState = {
        ...session,
        attribution,
        lastResults: [],
        lastResultsEmpty: true,
        nextIndex: 0,
        chunkSize: ensureChunkSize(session),
        lastAction: "nearby",
      };
      setNearbySession(key, updated);
      pushAssistantText(attribution ? `${note}\n\n${attribution}` : note);
      return true;
    }

    const chunkSize = ensureChunkSize(session);
    const firstCount = Math.min(response.results.length, chunkSize);
    const updated: NearbySessionState = {
      ...session,
      attribution,
      lastResults: response.results,
      lastResultsEmpty: false,
      nextIndex: firstCount,
      chunkSize,
      lastAction: "nearby",
    };
    setNearbySession(key, updated);
    emitNearbyResults(updated, 0, firstCount);
    return true;
  };

  const showMoreNearby = (key: string, session: NearbySessionState) => {
    if (!session.lastResults.length) {
      pushAssistantText('No saved nearby results yet. Try searching again.');
      return true;
    }
    const chunkSize = ensureChunkSize(session);
    if (session.nextIndex >= session.lastResults.length) {
      pushAssistantText('You have reached the end of the list. Try widening the radius or another category.');
      return true;
    }
    const start = session.nextIndex;
    const count = Math.min(chunkSize, session.lastResults.length - start);
    const updated: NearbySessionState = {
      ...session,
      nextIndex: start + count,
      lastAction: "nearby",
    };
    setNearbySession(key, updated);
    emitNearbyResults(updated, start, count, { prefix: `More ${NEARBY_LABELS[session.kind].plural}:` });
    return true;
  };

  const showPreviousNearby = (key: string, session: NearbySessionState) => {
    if (!session.lastResults.length) {
      pushAssistantText('No saved nearby results yet. Try searching again.');
      return true;
    }
    const chunkSize = ensureChunkSize(session);
    if (session.nextIndex <= chunkSize) {
      emitNearbyResults(session, 0, Math.min(chunkSize, session.lastResults.length));
      return true;
    }
    const start = Math.max(0, session.nextIndex - chunkSize * 2);
    const updated: NearbySessionState = {
      ...session,
      nextIndex: Math.max(chunkSize, start + chunkSize),
      lastAction: "nearby",
    };
    setNearbySession(key, updated);
    emitNearbyResults(updated, start, Math.min(chunkSize, updated.lastResults.length - start), {
      prefix: `Previous ${NEARBY_LABELS[session.kind].plural}:`,
    });
    return true;
  };

  const respondWithDirections = (session: NearbySessionState, index: number) => {
    if (!session.lastResults.length) {
      pushAssistantText('No saved places yet. Try running a nearby search first.');
      return true;
    }
    const idx = index - 1;
    if (idx < 0 || idx >= session.lastResults.length) {
      pushAssistantText('That number is out of range. Try a smaller number.');
      return true;
    }
    const place = session.lastResults[idx];
    const mapsUrl = `https://www.google.com/maps?q=${place.lat},${place.lon}`;
    const message = `🧭 Directions for **${place.name}**:\n- Google Maps: ${mapsUrl}\n- OpenStreetMap: ${place.osm_url}`;
    pushAssistantText(message);
    return true;
  };

  const respondWithCall = (session: NearbySessionState, index: number) => {
    if (!session.lastResults.length) {
      pushAssistantText('No saved places yet. Try running a nearby search first.');
      return true;
    }
    const idx = index - 1;
    if (idx < 0 || idx >= session.lastResults.length) {
      pushAssistantText('That number is out of range. Try a smaller number.');
      return true;
    }
    const place = session.lastResults[idx];
    if (!place.phone) {
      pushAssistantText(`No phone number listed for **${place.name}**.`);
      return true;
    }
    pushAssistantText(`📞 Call **${place.name}** at ${place.phone}.`);
    return true;
  };

  const filterOpenNow = (session: NearbySessionState) => {
    if (!session.lastResults.length) {
      pushAssistantText('No saved places yet. Try running a nearby search first.');
      return true;
    }
    const withHours = session.lastResults.filter((item) => typeof item.opening_hours === 'string' && item.opening_hours.trim().length);
    if (!withHours.length) {
      pushAssistantText('The current results do not list opening hours. Showing all places instead.');
      emitNearbyResults(session, 0, Math.min(ensureChunkSize(session), session.lastResults.length));
      return true;
    }
    const aroundTheClock = withHours.filter((item) => /24\s*[x/\-]?7/i.test(item.opening_hours ?? ''));
    if (!aroundTheClock.length) {
      pushAssistantText('None of the saved places are marked 24/7.');
      return true;
    }
    const mockSession: NearbySessionState = {
      ...session,
      lastResults: aroundTheClock,
      attribution: session.attribution,
    };
    emitNearbyResults(mockSession, 0, Math.min(ensureChunkSize(session), aroundTheClock.length), {
      prefix: `Places tagged 24/7 (${NEARBY_LABELS[session.kind].plural}):`,
    });
    return true;
  };

  async function tryNearbyQuickPath(text: string) {
    const raw = text.trim();
    if (!raw) return false;

    const lower = raw.toLowerCase();
    const key = nearbySessionKey();
    const session = getNearbySession(key);
    const inNearbyContext = !!session && session.lastAction === 'nearby';

    const radiusMatch = NEARBY_RADIUS_RE.exec(lower);
    const requestedRadiusKm = parseRadiusMatch(radiusMatch);
    const areaFromText = extractAreaFromText(raw);
    const pinMatch = raw.match(PINCODE_RE);
    const pinCode = pinMatch ? pinMatch[0] : null;
    const kindCandidate = detectNearbyKindFromText(lower, session?.kind);
    const wantsNearby = hasNearbyKeyword(lower) || Boolean(pinCode) || (!!kindCandidate && /\bnear\b/i.test(lower));

    if (session) {
      if (inNearbyContext && NEARBY_CONFIRM_RE.test(lower)) {
        const nextRadius = session.lastResultsEmpty ? nextExpandRadius(session.radiusKm) : session.radiusKm;
        const updatedSession: NearbySessionState = {
          ...session,
          radiusKm: nextRadius,
          lastResultsEmpty: false,
        };
        return fetchAndRenderNearby(key, updatedSession);
      }

      if (NEARBY_EXPAND_RE.test(lower)) {
        const nextRadius = nextExpandRadius(session.radiusKm);
        if (nextRadius === session.radiusKm) {
          pushAssistantText('Radius is already at the maximum of 10 km. Try another category.');
          return true;
        }
        const updatedSession: NearbySessionState = {
          ...session,
          radiusKm: nextRadius,
          lastResultsEmpty: false,
        };
        return fetchAndRenderNearby(key, updatedSession);
      }

      if (requestedRadiusKm !== null) {
        const updatedSession: NearbySessionState = {
          ...session,
          radiusKm: normalizeRadiusKm(requestedRadiusKm),
          lastResultsEmpty: false,
        };
        return fetchAndRenderNearby(key, updatedSession);
      }

      if (NEARBY_SHOW_MORE_RE.test(lower) && inNearbyContext) {
        return showMoreNearby(key, session);
      }

      if (NEARBY_PREVIOUS_RE.test(lower) && inNearbyContext) {
        return showPreviousNearby(key, session);
      }

      const directionsMatch = NEARBY_DIRECTIONS_RE.exec(lower);
      if (directionsMatch && inNearbyContext) {
        return respondWithDirections(session, Number(directionsMatch[1]));
      }

      const callMatch = NEARBY_CALL_RE.exec(lower);
      if (callMatch && inNearbyContext) {
        return respondWithCall(session, Number(callMatch[1]));
      }

      if (NEARBY_OPEN_NOW_RE.test(lower) && inNearbyContext) {
        return filterOpenNow(session);
      }

      if (NEARBY_CHANGE_CATEGORY_RE.test(lower) && inNearbyContext) {
        pushAssistantText('Sure — tell me which category you need: pharmacy, doctor, clinic, hospital, or lab.');
        setNearbySession(key, { ...session, lastAction: 'nearby' });
        return true;
      }

      if (NEARBY_LOCATION_REFRESH_RE.test(lower)) {
        const pos = await getUserPosition().catch(() => null);
        if (!pos) {
          pushAssistantText('Share your area or pincode to update the search (we won’t store it).');
          return true;
        }
        const updatedSession: NearbySessionState = {
          ...session,
          lat: pos.lat,
          lon: pos.lon,
          locationLabel: 'your location',
          lastResultsEmpty: false,
        };
        return fetchAndRenderNearby(key, updatedSession);
      }

      if ((pinCode || areaFromText) && (inNearbyContext || wantsNearby)) {
        const query = pinCode || areaFromText || '';
        const coords = await geocodeArea(query);
        if (!coords) {
          pushAssistantText(`Couldn't find **${query}**. Try another landmark or share your location.`);
          return true;
        }
        const label = pinCode ? `PIN ${pinCode}` : query.trim();
        const updatedSession: NearbySessionState = {
          ...session,
          lat: coords.lat,
          lon: coords.lon,
          locationLabel: label,
          lastResultsEmpty: false,
        };
        return fetchAndRenderNearby(key, updatedSession);
      }

      if (kindCandidate && kindCandidate !== session.kind && (inNearbyContext || wantsNearby)) {
        const updatedSession: NearbySessionState = {
          ...session,
          kind: kindCandidate,
          lastResultsEmpty: false,
        };
        return fetchAndRenderNearby(key, updatedSession);
      }
    }

    if (!kindCandidate) {
      return false;
    }

    if (!wantsNearby && !session) {
      return false;
    }

    let coords: { lat: number; lon: number } | null = null;
    let locationLabel: string | undefined;

    if (NEARBY_LOCATION_REFRESH_RE.test(lower) || /\bnear\s+me\b/.test(lower) || /\bnearby\b/.test(lower)) {
      coords = await getUserPosition().catch(() => null);
      if (coords) {
        locationLabel = 'your location';
      }
    }

    if (!coords && (pinCode || areaFromText)) {
      const query = pinCode || areaFromText || '';
      const resolved = await geocodeArea(query);
      if (!resolved) {
        pushAssistantText(`Couldn't find **${query}**. Try another landmark or share your location.`);
        return true;
      }
      coords = resolved;
      locationLabel = pinCode ? `PIN ${pinCode}` : query.trim();
    }

    if (!coords) {
      pushAssistantText('Share your area or pincode to find nearby places (we won’t store it).');
      return true;
    }

    const radiusKm = requestedRadiusKm !== null ? normalizeRadiusKm(requestedRadiusKm) : NEARBY_DEFAULT_RADIUS_KM;
    const newSession: NearbySessionState = {
      kind: kindCandidate,
      lat: coords.lat,
      lon: coords.lon,
      radiusKm,
      ts: Date.now(),
      lastResults: [],
      lastResultsEmpty: false,
      nextIndex: 0,
      chunkSize: NEARBY_CHUNK_SIZE,
      lastAction: 'nearby',
      locationLabel,
      attribution: undefined,
    };
    setNearbySession(key, newSession);
    return fetchAndRenderNearby(key, newSession);
  }

  function addOnce(id: string, content: string) {
    if (posted.current.has(id)) return;
    posted.current.add(id);
    addAssistant(content, { id });
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPush = (event: Event) => {
      const detail = (event as CustomEvent<{ content?: string; html?: string }>).detail;
      const content = typeof detail?.content === 'string' ? detail.content : '';
      if (!content.trim()) return;
      const id = uid();
      const message: ChatMessage = {
        id,
        role: 'assistant',
        kind: 'chat',
        content,
        pending: false,
      };
      setMessages(prev => [...prev, message]);
    };
    window.addEventListener('medx:push-assistant', onPush as EventListener);
    return () => window.removeEventListener('medx:push-assistant', onPush as EventListener);
  }, []);

  useEffect(() => {
    const fetchProfile = () => {
      fetch('/api/profile', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(j => setActiveProfile(j?.profile || null))
        .catch(() => {});
    };
    const onProfileUpdated = () => {
      // if profile thread is open, nudge a silent refresh of readiness/prompts
      // (kept light: we don’t spam messages, just clear cached “askedRecently”.)
      sessionStorage.removeItem('asked:proactive');
      fetchProfile();
    };
    fetchProfile();
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => window.removeEventListener('profile-updated', onProfileUpdated);
  }, []);

  // Load per-thread UI whenever threadId changes
  useEffect(() => {
    if (!threadId) { setUi(UI_DEFAULTS); return; }
    try {
      const raw = localStorage.getItem(uiKey(threadId));
      setUi(raw ? JSON.parse(raw) : UI_DEFAULTS);
    } catch {
      setUi(UI_DEFAULTS);
    }
  }, [threadId]);
  useEffect(() => { setPendingCommitIds([]); }, [threadId]);

  // Persist per-thread UI on change
  useEffect(() => {
    if (!threadId) return;
    try {
      localStorage.setItem(uiKey(threadId), JSON.stringify(ui));
    } catch {}
  }, [threadId, ui]);

  const isNearBottom = (el: HTMLElement, threshold = 120) =>
    el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

  const scrollToBottom = useCallback((el: HTMLElement) => {
    window.clearTimeout((scrollToBottom as any)._t);
    (scrollToBottom as any)._t = window.setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, 90);
  }, []);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    if (isNearBottom(el)) scrollToBottom(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      if (isNearBottom(el)) scrollToBottom(el);
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [scrollToBottom]);

  useEffect(() => {
    posted.current.clear();
    const tid = threadId || (isProfileThread ? 'med-profile' : null);
    if (tid) {
      ensureThread(tid);
      const saved = loadMessages(tid) as any[];
      setMessages(saved);
      posted.current = new Set(saved.filter(m => m.role === 'assistant').map((m: any) => m.id));
    } else {
      setMessages([]);
    }
  }, [threadId, isProfileThread]);

  useEffect(() => {
    if (!threadId) return;
    // Ensure first auto-opened chat also shows in sidebar
    upsertThreadIndex(threadId, "Untitled");
  }, [threadId]);

  useEffect(() => {
    if (!isProfileThread || !threadId) return;
    if (bootedRef.current[threadId]) return;     // run once per thread
    bootedRef.current[threadId] = true;
    (async () => {
      try {
        if (therapyMode) {
          // Therapy Mode: never call AI-Doc boot
          const intro = 'Hi, I’m here with you. Want to tell me what’s on your mind today? 💙';
          setMessages(prev => [...prev, { id: uid(), role:'assistant', kind:'chat', content:intro, pending:false }]);
        } else {
          // Profile/Doc path: explicitly request boot
          const boot = await fetch('/api/aidoc/message', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ text: "", boot: true })
          }).then(r=>r.json()).catch(()=>null);
          if (boot?.messages?.length) {
            setMessages(prev => [...prev, ...boot.messages.map((m:any) => ({
              id: uid(), role:m.role, kind:'chat', content:m.content, pending:false
            }))]);
          }
        }
        // single readiness nudge (skip if asked recently)
        if (askedRecently(threadId, 'proactive', 60)) return;
        const rd = await safeJson(fetch('/api/predictions/readiness'));
        const miss = rd?.missing || [];
        const pick = miss[0] as ('predispositions'|'medications'|'weight'|undefined);
        if (pick) {
          const q =
            pick === 'predispositions' ? 'Quick check: any family history/predispositions (e.g., diabetes, hypertension)? List comma-separated.'
            : pick === 'medications'   ? 'Quick check: do you take any regular meds? Please share name + dose (e.g., Metformin 500 mg).'
            :                            'Quick check: what is your current weight (kg)?';
          setMessages(prev => [...prev, { id: uid(), role:'assistant', kind:'chat', content: q, pending:false } as any]);
          setProactive({ kind: pick });
          markAskedNow(threadId, 'proactive');
        }
      } catch {}
    })();
  }, [isProfileThread, threadId, therapyMode]);

  useEffect(() => {
    if (!isProfileThread && messages.length === 0) {
      addOnce('welcome:chat', getRandomWelcome());
    }
  }, [isProfileThread, messages.length]);

  useEffect(() => {
    const tid = threadId || (isProfileThread ? 'med-profile' : null);
    if (tid) saveMessages(tid, messages as any);
  }, [messages, threadId, isProfileThread]);

  const draftKey = (threadId?: string|null)=> `chat:${threadId||'med-profile'}:draft`;
  // load draft and inject as past message (so it "reappears as past messages")
  useEffect(() => {
    const key = draftKey(threadId);
    try {
      const draft = localStorage.getItem(key);
      if (draft && draft.trim()) {
        setMessages(prev => [...prev, { id: uid(), role:'user', kind:'chat', content: draft, pending:false } as any]);
        localStorage.removeItem(key);
      }
    } catch {}
  // only once per thread change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);
  // keep draft synced
  useEffect(() => {
    const key = draftKey(threadId);
    try { localStorage.setItem(key, userText || ''); } catch {}
  }, [userText, threadId]);

  useEffect(() => {
    const root = document.documentElement;
    if (therapyMode) {
      root.classList.add('therapy-mode');
      const kicked = sessionStorage.getItem('therapyStarter');
      if (!kicked) {
        (async () => {
          try {
            sessionStorage.setItem('therapyStarter', '1');
            const intro = 'Hi, I’m here to support you, but I’m not a licensed therapist. What would you like to talk about today?';
            setMessages((prev: any[]) => [
              ...prev,
              { id: uid(), role: 'assistant', kind: 'chat', content: intro, pending: false }
            ]);
            try {
              const sess = await safeJson(fetch('/api/auth/session'));
              const userId = sess?.user?.id;
              if (userId) {
                try {
                  const r = await fetch(`/api/therapy/notes?userId=${userId}&limit=3`);
                  const { notes } = await r.json();

                  if (Array.isArray(notes) && notes.length > 0) {
                    const last = notes[0];
                    const goal = (last?.next_step) || (last?.meta?.goals?.[0]);

                    if (goal && typeof goal === 'string' && goal.trim().length > 0) {
                      const follow = `Quick check-in: last time you planned **${goal.trim()}** — how did it go?`;
                      setMessages((prev: any[]) => [
                        ...prev,
                        { id: uid(), role: 'assistant', kind: 'chat', content: follow, pending: false }
                      ]);
                    } else {
                      const pieces = notes
                        .map((n: any) => (n?.summary || '').trim())
                        .filter(Boolean)
                        .slice(0, 3);

                      if (pieces.length > 0) {
                        const gist = pieces.length === 1 ? pieces[0] : pieces.slice(0, 2).join('; ');
                        const line = `Last time we explored: ${gist} — want to continue from there or talk about something new?`;
                        setMessages((prev: any[]) => [
                          ...prev,
                          { id: uid(), role: 'assistant', kind: 'chat', content: line, pending: false }
                        ]);
                      }
                    }
                  }
                } catch {
                  // fail-soft: no continuity lines if fetch fails
                }
              }
            } catch {}
          } catch {
            /* ignore */
          }
        })();
      }
    } else {
      root.classList.remove('therapy-mode');
    }
  }, [therapyMode]);


  function labsMarkdown(trend: any[]) {
    const lines = buildTrendLines(trend);
    if (lines.length === 0) return NO_LABS_MESSAGE;
    return ['**Your latest labs (vs previous):**', ...lines].join('\n');
  }


  async function send(text: string, researchMode: boolean, opts: SendOpts = {}) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setThinkingStartedAt(Date.now());

    const normalize = (s: string) =>
      s
        .replace(/\bnp\b/gi, "neutrophil percentage")
        .replace(/\bsgpt\b/gi, "ALT (SGPT)")
        .replace(/\bsgot\b/gi, "AST (SGOT)");
    const messageText = isProfileThread ? normalize(text) : text;
    const visualEcho = opts.visualEcho !== false;
    const clientRequestId = opts.clientRequestId || crypto.randomUUID();
    if (threadId) pushFullMem(threadId, "user", messageText);
    if (stableThreadId) {
      try { pushFullMem(stableThreadId, "user", messageText); } catch {}
    }

    // Social intent handling (strict + low-noise)
    const social = (SOCIAL_MODE === 'off' || therapyMode) ? null : detectSocialIntent(messageText);
    if (social) {
      if (social === 'yes') {
        const lastUser = [...messages].reverse().find(m => m.role === 'user');
        const replay = (lastUser?.content || '').trim();
        setBusy(false);
        setThinkingStartedAt(null);
        setUserText('');
        if (replay) await send(replay, researchMode, { visualEcho: false });
      } else {
        setBusy(false);
        setThinkingStartedAt(null);
        setUserText('');
      }
      // 'chatty' (optional): uncomment to show lines
      // if (SOCIAL_MODE === 'chatty') {
      //   const msgBase = replyForSocialIntent(social, currentMode);
      //   setMessages(prev => [...prev, { id: uid(), role: 'assistant', kind: 'chat', content: msgBase } as any]);
      // }
      return;
    }

    // --- EDIT FAST-PATH (disabled) ---
    try {
      const edit = null; // recipe/plan edit disabled
      if (edit) {
        // recipe edit logic removed
      }
    } catch {
      // never block the normal flow
    }

    const userId = uid();
    const pendingId = uid();
    // Dedupe: avoid back-to-back identical user bubbles
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const isDupUser = !!lastUser && lastUser.content.trim() === messageText.trim();
    const nextMsgs: ChatMessage[] = (visualEcho && !isDupUser)
      ? [
          ...messages,
          { id: userId, role: 'user', kind: 'chat', content: messageText } as ChatMessage,
          { id: pendingId, role: 'assistant', kind: 'chat', content: '', pending: true } as ChatMessage,
        ]
      : [
          ...messages,
          { id: pendingId, role: 'assistant', kind: 'chat', content: '', pending: true } as ChatMessage,
        ];
    setMessages(nextMsgs);
    const maybe = maybeFixMedicalTypo(messageText);
    if (maybe && messages.filter(m => m.role === "assistant").slice(-1)[0]?.content !== maybe.ask) {
      // Ask once, keep pending bubble as the question (no LLM call)
      setMessages(prev => prev.map(m => m.id === pendingId ? { ...m, content: maybe.ask, pending: false } : m));
      if (threadId && maybe.ask.trim()) {
        pushFullMem(threadId, "assistant", maybe.ask);
        maybeIndexStructured(threadId, maybe.ask);
      }
      if (stableThreadId) {
        try { pushFullMem(stableThreadId, "assistant", maybe.ask); } catch {}
      }
      setBusy(false);
      setThinkingStartedAt(null);
      return; // wait for user Yes/No
    }
    setUserText('');
    if (
      !isProfileThread &&
      threadId &&
      text.trim() &&
      messages.filter(m => m.role === 'user').length === 0
    ) {
      const nt = generateTitle(text);
      updateThreadTitle(threadId, nt);
      upsertThreadIndex(threadId, nt);
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = '';
    try {
      const fullContext = buildFullContext(stableThreadId);
      const contextBlock = fullContext ? `\n\nCONTEXT (recent conversation):\n${fullContext}` : "";
      if (isProfileThread) {
        const isLast = /last (blood )?(report|labs?)/i.test(messageText);
        const isChanges = /(all|my) (reports|labs?).*(changes|trend|improv|wors)/i.test(messageText);
        const isDatewise = /(date ?wise|by date|chronolog)/i.test(messageText);
        if (isLast || isChanges || isDatewise) {
          if (!isAiDocMode) {
            setMessages(prev =>
              prev.map(m =>
                m.id === pendingId
                  ? { ...m, content: REPORTS_LOCKED_MESSAGE, pending: false }
                  : m
              )
            );
            setBusy(false);
            setThinkingStartedAt(null);
            return;
          }
          try {
            const res = await fetch('/api/labs/summary?mode=ai-doc');
            const body = await res.json().catch(() => null);
            if (body?.ok && Array.isArray(body.trend)) {
              const summary = labsMarkdown(body.trend);
              setMessages(prev =>
                prev.map(m => (m.id === pendingId ? { ...m, content: summary, pending: false } : m))
              );
              if (threadId && summary.trim()) {
                pushFullMem(threadId, 'assistant', summary);
                maybeIndexStructured(threadId, summary);
              }
              if (stableThreadId) {
                try { pushFullMem(stableThreadId, 'assistant', summary); } catch {}
              }
              setBusy(false);
              setThinkingStartedAt(null);
              return;
            }
          } catch {}
        }

        const thread = [
          ...messages
            .filter(m => !m.pending)
            .map(m => ({ role: m.role, content: (m as any).content || '' })),
          { role: 'user', content: `${messageText}${contextBlock}` }
        ];

        const endpoint = '/api/aidoc/chat';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: mode === 'doctor' ? 'doctor' : 'patient',
            messages: thread,
            threadId,
            context,
            clientRequestId
          }),
          signal: ctrl.signal
        });
        if (res.status === 409) {
          setMessages(prev => prev.filter(m => m.id !== pendingId));
          setBusy(false);
          setThinkingStartedAt(null);
          return;
        }
        if (!res.ok || !res.body) throw new Error(`Chat API error ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        acc = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            if (line.trim() === 'data: [DONE]') continue;
            try {
              const payload = JSON.parse(line.replace(/^data:\s*/, ''));
              const delta = payload?.choices?.[0]?.delta?.content;
              if (delta) {
                acc += delta;
                setMessages(prev => prev.map(m => (m.id === pendingId ? { ...m, content: acc } : m)));
              }
            } catch {}
          }
        }
        const { main, followUps } = splitFollowUps(acc);
        setMessages(prev =>
          prev.map(m =>
            m.id === pendingId ? { ...m, content: main, followUps, pending: false } : m
          )
        );
        if (threadId && main && main.trim()) {
          pushFullMem(threadId, "assistant", main);
          maybeIndexStructured(threadId, main);
        }
        if (stableThreadId) {
          try { pushFullMem(stableThreadId, "assistant", main); } catch {}
        }
        return;
      }
      if (therapyMode) {
        const thread = [...messages, { role: 'user', content: text }]
          .map(m => ({
            role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
            content: String((m as any).content ?? (m as any).text ?? '').trim()
          }))
          .filter(m => m.content);
        let j: any;
        try {
          j = await safeJson(
            fetch('/api/therapy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: 'therapy', messages: thread })
            })
          );
        } catch (e: any) {
          const msg = String(e?.message || 'HTTP error');
          const content = `⚠ ${msg}`;
          setMessages(prev => prev.map(m =>
            m.id === pendingId
              ? { ...m, content, pending: false, error: msg }
              : m
          ));
          if (threadId && content.trim()) {
            pushFullMem(threadId, "assistant", content);
            maybeIndexStructured(threadId, content);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, "assistant", content); } catch {}
          }
          return;
        }

        if (j?.completion) {
          const content = j.completion;
          setMessages(prev => prev.map(m =>
            m.id === pendingId ? { ...m, content, pending: false } : m
          ));
          if (threadId && content.trim()) {
            pushFullMem(threadId, "assistant", content);
            maybeIndexStructured(threadId, content);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, "assistant", content); } catch {}
          }
        } else if (j?.starter) {
          const content = j.starter;
          setMessages(prev => prev.map(m =>
            m.id === pendingId ? { ...m, content, pending: false } : m
          ));
          if (threadId && content.trim()) {
            pushFullMem(threadId, "assistant", content);
            maybeIndexStructured(threadId, content);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, "assistant", content); } catch {}
          }
        } else {
          const content = '⚠ Empty response from server.';
          setMessages(prev => prev.map(m =>
            m.id === pendingId
              ? { ...m, content, pending: false, error: 'Empty response from server.' }
              : m
            ));
          if (threadId && content.trim()) {
            pushFullMem(threadId, "assistant", content);
            maybeIndexStructured(threadId, content);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, "assistant", content); } catch {}
          }
        }
        if (j?.wrapup) {
          setMessages(prev => [
            ...prev,
            { id: uid(), role: 'assistant', kind: 'chat', content: j.wrapup, pending: false }
          ]);
          if (threadId && j.wrapup.trim()) {
            pushFullMem(threadId, 'assistant', j.wrapup);
            maybeIndexStructured(threadId, j.wrapup);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, 'assistant', j.wrapup); } catch {}
          }
        }
        return;
      }
      const intent = detectFollowupIntent(text);
      const follow = isFollowUp(text);
      const ctx = ui.contextFrom ? active : null;
      if (!ui.topic && !intent) setUi(prev => ({ ...prev, topic: text }));
      else if (isNewTopic(text)) setUi(prev => ({ ...prev, topic: text }));

      // ADD: intercept follow-ups with no active doc context by using full conversation memory
      if (follow && !ctx) {
        // Build a normal prompt but with fullContext injected (see step 2).
        // Do not return here; let it flow into your normal LLM call with contextBlock included.
      }

      // Only show the "no context" warning if there is truly no stored conversation
      if (follow && !ctx && !(intent && ui.topic)) {
        const hasAnyMemory = !!buildFullContext(stableThreadId);
        if (!hasAnyMemory) {
          const warn = "I don't have context from earlier in this session. Please reattach or restate it if you'd like me to use it.";
          setMessages(prev =>
            prev.map(m =>
              m.id === pendingId
                ? { ...m, pending: false, content: warn }
                : m
            )
          );
          if (threadId && warn.trim()) {
            pushFullMem(threadId, "assistant", warn);
            maybeIndexStructured(threadId, warn);
          }
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, "assistant", warn); } catch {}
          }
          setBusy(false);
          setThinkingStartedAt(null);
          return;
        }
        // else: proceed to normal LLM call with contextBlock (added above)
      }

      // === ADD-ONLY: domain style selection ===
      let DOMAIN_STYLE = "";
      try {
        const d = detectDomain(messageText);
        if (d === "allied")      DOMAIN_STYLE = DomainStyles.ALLIED_STYLE;
        else if (d === "wellness")   DOMAIN_STYLE = DomainStyles.WELLNESS_STYLE;
        else if (d === "technical")  DOMAIN_STYLE = DomainStyles.TECHNICAL_SCI_STYLE;
        else if (d === "behavioral") DOMAIN_STYLE = DomainStyles.BEHAVIORAL_STYLE;
        else if (d === "supportive") DOMAIN_STYLE = DomainStyles.SUPPORTIVE_STYLE;
        else if (d === "compliance") DOMAIN_STYLE = DomainStyles.COMPLIANCE_STYLE;
      } catch {}

      const linkNudge =
        'When adding a reference, always format as [title](https://full.url) with the full absolute URL. Never output Learn more without a URL, and never use relative links.';
      const baseSys =
        mode === 'doctor'
          ? `You are a clinical assistant. Write clean markdown with headings and bullet lists.
If CONTEXT has codes, interactions, or trials, summarize and add clickable links. Avoid medical advice.
${linkNudge}`
          : `You are a patient-friendly explainer. Use simple markdown and short paragraphs.
If CONTEXT has codes or trials, explain them in plain words and add links. Avoid medical advice.
${linkNudge}`;
      const systemCommon = `\nUser country: ${country.code3} (${country.name}). Use generics and note availability varies by region.\nEnd with one short follow-up question (<=10 words) that stays on the current topic.\n`;
      const topicHint = ui.topic ? `ACTIVE TOPIC: ${ui.topic}\nKeep answers scoped to this topic unless the user changes it.\n` : "";

      // Per-mode drafting style (structure only; no provider changes)
      const PATIENT_DRAFT_STYLE = [
        "FORMAT: Use 2–3 short sections with bold headers and bullets.",
        "For 'what is' questions, default to these sections:",
        "## **What it is**",
        "## **Types**",
        "Finish with one short follow-up question (≤10 words).",
      ].join("\n");
      const DOCTOR_DRAFT_STYLE = [
        "FORMAT (clinical, concise): Use bold headers + bullets.",
        "For definition-type asks, prefer this outline:",
        "## **Definition (clinical)**",
        "## **Phenotypes**",
        "## **Red flags** (include only if relevant)",
        "## **Initial work-up (typical)** (include only if appropriate)",
        "Finish with one short follow-up question (≤10 words).",
      ].join("\n");

      // Intent-aware structure (lightweight)
      const { getIntentStyle } = await import("@/lib/intents");

      // Build drafting structure once from the base mode
      const DRAFT_STYLE = modeState.base === "doctor" ? DOCTOR_DRAFT_STYLE : PATIENT_DRAFT_STYLE;
      const INTENT_STYLE = getIntentStyle(messageText || "", mode);
      const STRUCTURE_STYLE = [DRAFT_STYLE, INTENT_STYLE || ""].filter(Boolean).join("\n\n");

      const RESEARCH_STITCH = modeState.research
        ? [
            "RESEARCH INTEGRATION:",
            "- Keep the above section headings exactly as-is.",
            "- Add 1–2 bullets labeled **Research says:** where relevant.",
            "- Cite inline as [1], [2] and include linked references at the end."
          ].join("\n")
        : "";

      const buildSystemAll = (base: string, domain?: string, adv?: string) =>
        [base, domain || "", adv || "", STRUCTURE_STYLE, RESEARCH_STITCH]
          .filter(Boolean)
          .join("\n\n");

      const sys = topicHint + systemCommon + baseSys;
      const sysWithDomain = sys;
      let ADV_STYLE = "";
      const adv = detectAdvancedDomain(messageText);
      if (adv) {
        const D = await import("@/lib/prompts/advancedDomains");
        ADV_STYLE =
          adv === "behav-med"      ? D.BEHAV_MED_STYLE :
          adv === "env-occ"        ? D.ENV_OCC_STYLE :
          adv === "data-tech"      ? D.DATA_TECH_STYLE :
          adv === "genomics"       ? D.GENOMICS_STYLE :
          adv === "preventive"     ? D.PREVENTIVE_STYLE :
          adv === "systems-policy" ? D.SYSTEMS_POLICY_STYLE : "";
      }
      // Append mode structure and any intent-specific structure
      const systemAll = buildSystemAll(sysWithDomain, DOMAIN_STYLE, ADV_STYLE);
      let chatMessages: { role: string; content: string }[];

      const looksLikeMath = /[0-9\.\s+\-*\/^()]{6,}/.test(messageText) || /sin|cos|log|sqrt|derivative|integral|limit/i.test(messageText);
      let toolBlock = "";
      if (looksLikeMath) {
        try { const res = await computeEval(messageText); toolBlock = `\n\nTOOL RESULT:\n${res}`; } catch {}
      }
      const historyIntent = /\b(empire|war|dynasty|revolution|treaty|reign)\b/i.test(messageText);
      const doctorIntent = mode === "doctor" || /\b(symptom|diagnosis|treatment|disease|syndrome|pain|infection|therapy|medication)\b/i.test(messageText);

      if (looksLikeMath) {
        const STYLE_MATH = `You are a rigorous solver. Show: (1) setup, (2) key steps, (3) final answer WITH UNITS, (4) quick self-check. Do not reveal hidden reasoning.`;
        chatMessages = [
          { role: "system", content: `${systemAll}\n\n${STYLE_MATH}` },
          { role: "user", content: `${messageText}${toolBlock}${contextBlock}` }
        ];
      } else if (historyIntent) {
        const { HISTORY_STYLE: STYLE_HISTORY } = await import("@/lib/prompts/history");
        chatMessages = [
          { role: "system", content: `${systemAll}\n\n${STYLE_HISTORY}` },
          { role: "user", content: `${messageText}${contextBlock}` }
        ];
      } else if (doctorIntent) {
        const { DOCTOR_STYLE: STYLE_DOCTOR } = await import("@/lib/prompts/doctor");
        chatMessages = [
          { role: "system", content: `${systemAll}\n\n${STYLE_DOCTOR}` },
          { role: "user", content: `${messageText}${contextBlock}` }
        ];
      }

      if (!chatMessages && intent && ui.topic) {
        chatMessages =
          intent === 'hospitals'
            ? buildHospitalsPrompt(ui.topic, country)
            : intent === 'trials'
            ? await (async () => {
                // 1) fetch real trials
                const { rows } = await getTrials({
                  condition: ui.topic!,
                  country: country.name, // ClinicalTrials.gov expects country name
                  status: "Recruiting,Enrolling by invitation",
                  phase: "Phase 2,Phase 3",
                  page: 1,
                  pageSize: 10,
                });

                // 2) if none found, fall back to the old high-level summary
                if (!rows.length) return buildTrialsPrompt(ui.topic!, country);

                // 3) build a structured summarization prompt using the rows
                const content =
                  mode === "patient"
                    ? patientTrialsPrompt(rows, ui.topic!)
                    : clinicianTrialsPrompt(rows, ui.topic!);

                // 4) Instruct the LLM to produce a concrete list with NCT IDs + links
                return [
                  {
                    role: "system",
                    content:
`You are ${BRAND_NAME}. Turn the provided "Data" JSON into a concise, accurate list of active clinical trials.
For each item: {Title — NCT ID — Phase — Status — Where (City, Country) — What/Primary outcome — Link}.
Do not invent IDs. If info missing, omit that field. Keep to 5–10 items. End with one short follow-up question.`
                  },
                  { role: "user", content }
                ];
              })()
            : buildMedicinesPrompt(ui.topic, country);
        chatMessages[1].content += contextBlock;
      } else if (!chatMessages && follow && ctx) {
        const fullMem = fullContext;
        const system = `You are ${BRAND_NAME}. This is a FOLLOW-UP.
Here is the ENTIRE conversation so far:
${fullMem || "(none)"}

${systemCommon}` + baseSys;
        const systemWithDomain = system;
        const systemAll = buildSystemAll(systemWithDomain, DOMAIN_STYLE, ADV_STYLE);
        const userMsg = `Follow-up: ${text}\nIf the question is ambiguous, ask one concise disambiguation question and then answer briefly using the context.`;
        chatMessages = [
          { role: 'system', content: systemAll },
          { role: 'user', content: `${userMsg}${contextBlock}` }
        ];
      } else if (!chatMessages) {
        const plan = await safeJson(
          fetch('/api/medx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: text, mode, researchMode, filters })
          })
        );

        const sys = topicHint + systemCommon + baseSys;
        const sysWithDomain = sys;
        const systemAll = buildSystemAll(sysWithDomain, DOMAIN_STYLE, ADV_STYLE);
        const planContextBlock = 'CONTEXT:\n' + JSON.stringify(plan.sections || {}, null, 2);
        chatMessages = [
          { role: 'system', content: systemAll },
          { role: 'user', content: `${text}\n\n${planContextBlock}${contextBlock}` }
        ];
      }

      const url = `/api/chat/stream${researchMode ? '?research=1' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-conversation-id': conversationId,
          'x-new-chat': messages.length === 0 ? 'true' : 'false'
        },
        body: JSON.stringify({
          mode: mode === 'doctor' ? 'doctor' : 'patient',
          messages: chatMessages,
          threadId,
          context,
          clientRequestId,
          research: researchMode
        }),
        signal: ctrl.signal
      });
      if (res.status === 409) {
        setMessages(prev => prev.filter(m => m.id !== pendingId));
        setBusy(false);
        setThinkingStartedAt(null);
        return;
      }
      if (!res.ok || !res.body) throw new Error(`Chat API error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      acc = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          if (line.trim() === 'data: [DONE]') continue;
          try {
            const payload = JSON.parse(line.replace(/^data:\s*/, ''));
            const delta = payload?.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages(prev =>
                prev.map(m => (m.id === pendingId ? { ...m, content: acc } : m))
              );
            }
          } catch {}
        }
      }
      const { main, followUps } = splitFollowUps(acc);
      setMessages(prev =>
        prev.map(m =>
          m.id === pendingId ? { ...m, content: main, followUps, pending: false } : m
        )
      );
      if (researchMode) {
        const lastUserMsg = text;
        const audience = mode;
        try {
          const r = await fetch('/api/research/bundle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: lastUserMsg, filters, audience })
          });
          const data = await r.json();
          const cites = Array.isArray(data?.citations) ? data.citations : [];
          setMessages(prev => prev.map(msg =>
            msg.id === pendingId ? { ...msg, citations: cites } : msg
          ));
        } catch {}
      }
      if (threadId && main && main.trim()) {
        pushFullMem(threadId, "assistant", main);
        maybeIndexStructured(threadId, main);
      }
      if (stableThreadId) {
        try { pushFullMem(stableThreadId, "assistant", main); } catch {}
      }
      if (main.length > 400) {
        setFromChat({ id: pendingId, content: main });
        setUi(prev => ({ ...prev, contextFrom: 'Conversation summary' }));
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setMessages(prev =>
          prev.map(m =>
            m.id === pendingId
              ? Object.assign({}, m, { content: acc, pending: false })
              : m
          )
        );
        return;
      }
      console.error(e);
      const content = `⚠️ ${String(e?.message || e)}`;
      setMessages(prev =>
        prev.map(m =>
          m.id === pendingId
            ? Object.assign({}, m, { content, pending: false, error: String(e?.message || e) })
            : m
        )
      );
      if (threadId && content.trim()) {
        pushFullMem(threadId, 'assistant', content);
        maybeIndexStructured(threadId, content);
      }
      if (stableThreadId) {
        try { pushFullMem(stableThreadId, 'assistant', content); } catch {}
      }
    } finally {
      setBusy(false);
      setThinkingStartedAt(null);
      abortRef.current = null;
    }
  }

  function onStop() {
    const c = abortRef.current;
    if (c) c.abort();
  }

  function onFileSelected(file: File) {
    setPendingFile(file);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function analyzeFile(file: File, noteText: string) {
    if (!file || busy) return;
    setBusy(true);
    setThinkingStartedAt(Date.now());
    const pendingId = uid();
    setMessages(prev => [
      ...prev,
      { id: pendingId, role: 'assistant', kind: 'analysis', content: 'Analyzing…', pending: true }
    ]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doctorMode', String(mode === 'doctor'));
      fd.append('country', country.code3);
      if (noteText.trim()) fd.append('note', noteText.trim());
      const search = new URLSearchParams(window.location.search);
      const threadId = search.get('threadId');
      if (threadId) fd.append('threadId', threadId);
      const sourceHash = `${file?.name ?? 'doc'}:${file?.size ?? ''}:${(file as any)?.lastModified ?? ''}`;
      fd.append('sourceHash', sourceHash);
      const data = await safeJson(
        fetch('/api/analyze', { method: 'POST', body: fd })
      );
      setMessages(prev =>
        prev.map(m =>
          m.id === pendingId
            ? {
                id: pendingId,
                role: 'assistant',
                kind: 'analysis',
                category: data.category,
                content: data.report,
                pending: false
              }
            : m
        )
      );
      setFromAnalysis({ id: pendingId, category: data.category, content: data.report });
      setUi(prev => ({
        ...prev,
        contextFrom: titleForCategory(data.category),
        topic: inferTopicFromDoc(data.report),
      }));
      if (!isProfileThread && Array.isArray(data.obsIds) && data.obsIds.length) {
        setPendingCommitIds(data.obsIds.map(String));
      }
    } catch (e: any) {
      console.error(e);
      setMessages(prev =>
        prev.map(m =>
          m.id === pendingId
            ? {
                ...m,
                content: `⚠️ ${String(e?.message || e)}`,
                pending: false,
                error: String(e?.message || e)
              }
            : m
        )
      );
    } finally {
      setBusy(false);
      setThinkingStartedAt(null);
      setPendingFile(null);
      setUserText('');
    }
  }

  async function onSubmit() {
    if (busy || inFlight) return;
    inFlight = true;
    try {
      const trimmed = userText.trim();
      if (!pendingFile && trimmed) {
        const summarizeMatch = /^summarize\s+(NCT\d{8})$/i.exec(trimmed);
        if (summarizeMatch) {
          const nct = summarizeMatch[1].toUpperCase();
          setMessages(prev => [...prev, { id: uid(), role: 'user', kind: 'chat', content: trimmed, pending: false } as any]);
          setUserText('');
          if (threadId) pushFullMem(threadId, 'user', trimmed);
          if (stableThreadId) {
            try { pushFullMem(stableThreadId, 'user', trimmed); } catch {}
          }
          setBusy(true);
          setThinkingStartedAt(Date.now());
          try {
            pushAssistantToChat({ content: '_Summarizing trial…_' });
            const response = await fetch(`/api/trials/${nct}/summary`, { cache: 'no-store' });
            const raw = await response.text();
            let payload: unknown = null;
            if (raw) {
              try {
                payload = JSON.parse(raw);
              } catch {
                payload = raw;
              }
            }
            if (!response.ok) {
              const message =
                typeof payload === 'object' && payload !== null && 'error' in (payload as Record<string, unknown>) &&
                typeof (payload as any).error === 'string'
                  ? (payload as any).error
                  : typeof payload === 'string' && payload
                    ? payload
                    : `Request failed (${response.status})`;
              throw new Error(message);
            }
            pushAssistantToChat({ content: formatTrialBriefMarkdown(nct, payload ?? {}) });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err ?? '');
            const detail = message.trim() || 'unknown error';
            pushAssistantToChat({ content: `⚠️ Could not summarize **${nct}**: ${detail}` });
          } finally {
            setBusy(false);
            setThinkingStartedAt(null);
          }
          return;
        }
      }

      if (!pendingFile && trimmed) {
        if (RAW_TEXT_INTENT.test(trimmed)) {
          setMessages(prev => [
            ...prev,
            { id: uid(), role: 'user', kind: 'chat', content: trimmed, pending: false } as any,
          ]);
          setUserText('');
          await showOcrText();
          return;
        }

        if (LABS_INTENT.test(trimmed)) {
          setMessages(prev => [
            ...prev,
            { id: uid(), role: 'user', kind: 'chat', content: trimmed, pending: false } as any,
          ]);
          setUserText('');
          const md = await buildReportTimelineCard();
          pushAssistantText(md);
          return;
        }
      }

      if (!pendingFile && trimmed && (await tryNearbyQuickPath(trimmed))) {
        setUserText('');
        return;
      }

    // --- Proactive single Q&A commit path (profile thread) ---
    if (isProfileThread && proactive && !pendingFile && userText.trim()) {
      const text = userText.trim();
      const ack = (msg: string) => setMessages(prev => [...prev, { id: uid(), role:'assistant', kind:'chat', content: msg, pending:false } as any]);
      try {
        if (proactive.kind === 'predispositions') {
          const items = Array.from(new Set(text.split(/[,;]+/).map(s=>s.trim()).filter(Boolean)));
          await fetch('/api/profile', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ conditions_predisposition: items }) });
          ack(`Noted — added predispositions: ${items.join(', ')}`);
          await fetch('/api/profile/summary', { cache:'no-store' });
          markAskedNow(threadId, 'proactive');
        } else if (proactive.kind === 'medications') {
          const meds = text.split(/[,;]+/).map(s=>s.trim()).filter(Boolean);
          for (const m of meds) {
            await fetch('/api/observations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'medication', value_text:m, meta:{ source:'chat', committed:true }, thread_id:'med-profile', observed_at:new Date().toISOString() }) });
          }
          ack(`Noted — recorded medications: ${meds.join('; ')}`);
          markAskedNow(threadId, 'proactive');
        } else {
          const kg = parseFloat(text.replace(/[, ]/g,'').replace(/[^\d.]/g,''));
          if (Number.isFinite(kg)) {
            await fetch('/api/observations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'weight', value_text:`${kg} kg`, value_num:kg, unit:'kg', thread_id:'med-profile', observed_at:new Date().toISOString(), meta:{ source:'chat', committed:true } }) });
            ack(`Noted — weight set to ${kg} kg.`);
            markAskedNow(threadId, 'proactive');
          } else {
            ack('Could not detect a number for weight. Please reply like “72 kg”.');
            return; // keep proactive open
          }
        }
      } catch { /* swallow; user sees ack or can retry */ }
      setProactive(null);
      setMessages(prev => [...prev, { id: uid(), role:'user', kind:'chat', content: text, pending:false } as any]);
      setUserText('');
      return;
    }

    // --- Medication verification (profile thread only; note-only submits) ---
    if (isProfileThread && !pendingFile && userText.trim()) {
      try {
        const v = await safeJson(fetch('/api/meds/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: userText }) }));
        if (v?.ok && v?.suggestion && window.confirm(`Did you mean "${v.suggestion}"?`)) {
          await safeJson(fetch('/api/observations', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              kind: 'medication',
              value_text: v.suggestion,
              unit: null,
              meta: { source: 'chat', confirmed: true, committed: true },
              thread_id: 'med-profile',
              observed_at: new Date().toISOString()
            })
          }));
          await safeJson(fetch('/api/observations', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              kind: 'note',
              value_text: `Added medication via chat: ${v.suggestion}`,
              unit: null,
              meta: { source: 'chat', committed: true },
              thread_id: 'med-profile',
              observed_at: new Date().toISOString()
            })
          }));
          const ackId = uid();
          setMessages(prev => [
            ...prev,
            { id: uid(), role:'user', kind:'chat', content: userText, pending:false } as any,
            { id: ackId, role:'assistant', kind:'chat', content:`Saved **${v.suggestion}** to your profile.`, pending:false } as any
          ]);
          setUserText('');
          return;
        }
      } catch {}
    }

    // Regular chat flow (file or note)
    if (!pendingFile && !userText.trim()) return;
    if (pendingFile) {
      await analyzeFile(pendingFile, userText);
    } else {
      await send(userText, researchMode);
      if (enabled) {
        try {
          const res = await fetch('/api/memory/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: userText, thread_id: threadId }),
          });
          if (res.ok) {
            const { suggestions } = await res.json();
            for (const s of (suggestions || [])) {
              if (rememberThisThread && s.scope === 'thread') s.source = 'manual';
              if (autoSave) {
                try {
                  const saveRes = await fetch('/api/memory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(s),
                  });
                  if (saveRes.ok) {
                    const json = await saveRes.json();
                    const saved = json?.items?.[0];
                    const label =
                      s.key === 'allergy' && s.value?.item ? `allergy: ${s.value.item}` :
                      s.key === 'diet_preference' && s.value?.label ? `diet: ${s.value.label}` :
                      s.key === 'medication' && s.value?.name ? `medication: ${s.value.name}` :
                      s.key;
                    if (saved?.id) setLastSaved({ id: saved.id, label });
                  } else {
                    console.error('Auto-save failed', saveRes.status, await saveRes.text());
                  }
                } catch (e) {
                  console.error('Auto-save error', e);
                }
              } else {
                pushSuggestion(s);
              }
            }
          }
        } catch (err) {
          console.error('Memory suggest failed', err);
        }
      }
    }
    } finally {
      inFlight = false;
    }
  }

  async function onQuickAction(action: 'simpler' | 'doctor' | 'next') {
    if (loadingAction) return;
    const last = getLastAnalysis(messages);
    if (!last) return;

    setLoadingAction(action);

    const tempId = `pending_${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        tempId,
        role: 'assistant',
        kind: 'analysis',
        category: last.category,
        content: 'Analyzing…',
        pending: true
      }
    ]);

    try {
      const data = await safeJson(
        fetch('/api/actions/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, mode, text: last.content, country: country.code3 })
        })
      );
      const finalMsg: ChatMessage = {
        id: data.id || crypto.randomUUID(),
        role: 'assistant',
        kind: 'analysis',
        category: last.category,
        content: data.report || data.content || ''
      };
      setMessages(prev => replaceFirstPendingWith(prev, finalMsg));
      setFromAnalysis({ id: finalMsg.id, category: last.category, content: finalMsg.content });
      setUi(prev => ({ ...prev, contextFrom: titleForCategory(last.category) }));
    } catch (e: any) {
      setMessages(prev =>
        replaceFirstPendingWith(prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          kind: 'analysis',
          category: last.category,
          content: 'Sorry — that request failed. Please try again.',
          error: e?.message || 'Request failed'
        })
      );
    } finally {
      setLoadingAction(null);
    }
  }

  function handleSuggestionAction(s: Suggestion) {
    if (!s.actionId) return;
    send(s.label, researchMode);
  }

  const onQuickActionRef = useRef(onQuickAction);
  useEffect(() => {
    onQuickActionRef.current = onQuickAction;
  }, [onQuickAction]);
  const stableOnQuickAction = useCallback(
    (action: 'simpler' | 'doctor' | 'next') => {
      return onQuickActionRef.current?.(action);
    },
    []
  );

  const handleSuggestionActionRef = useRef(handleSuggestionAction);
  useEffect(() => {
    handleSuggestionActionRef.current = handleSuggestionAction;
  }, [handleSuggestionAction]);
  const stableHandleSuggestionAction = useCallback((s: Suggestion) => {
    handleSuggestionActionRef.current?.(s);
  }, []);

  const assistantBusy = loadingAction !== null;
  const simpleMode = currentMode === 'patient';

  const renderedMessages = useMemo(
    () =>
      visibleMessages.map((m, index) => {
        const derivedKey =
          m.id ??
          (typeof (m as any).localId === 'string' ? (m as any).localId : undefined) ??
          (typeof (m as any).tempId === 'string' ? (m as any).tempId : undefined) ??
          `message-${index}`;
        const isLastVisible = index === visibleMessages.length - 1;
        const showThinkingTimer = isLastVisible && m.role === 'assistant' && busy && !!thinkingStartedAt;

        return (
          <div key={derivedKey} className="space-y-2">
            {m.role === 'user' ? (
              <div className="ml-auto max-w-3xl rounded-2xl px-4 py-3 shadow-sm bg-slate-200 text-slate-900 dark:bg-gray-700 dark:text-gray-100 text-left whitespace-normal">
                <ChatMarkdown content={m.content} />
              </div>
            ) : (
              <div className="space-y-4">
                <AssistantMessage
                  m={m}
                  researchOn={researchMode}
                  onQuickAction={stableOnQuickAction}
                  busy={assistantBusy}
                  therapyMode={therapyMode}
                  onAction={stableHandleSuggestionAction}
                  simple={simpleMode}
                  pendingTimerActive={showThinkingTimer}
                />
                <FeedbackBar
                  conversationId={conversationId}
                  messageId={m.id}
                  mode={currentMode}
                  model={undefined}
                  hiddenInTherapy={true}
                />
              </div>
            )}
          </div>
        );
      }),
    [
      visibleMessages,
      researchMode,
      assistantBusy,
      therapyMode,
      stableHandleSuggestionAction,
      simpleMode,
      conversationId,
      currentMode,
      stableOnQuickAction,
      busy,
      thinkingStartedAt
    ]
  );

  async function runAiDocWith(profileIntent: 'current' | 'new', newProfile?: any) {
    setLoadingAidoc(true);
    try {
      const text = (userText || '').trim() || lastUserMessageText || '';
      const r = await fetch('/api/ai-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          message: text,
          profileIntent,
          newProfile
        })
      });
      const data = await r.json();
      setAidoc(data);
    } finally {
      setLoadingAidoc(false);
      setShowPatientChooser(false);
      setShowNewIntake(false);
    }
  }
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && busy) {
        e.preventDefault();
        onStop();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [busy]);

  return (
    <div className="relative flex h-full flex-col">
      <Header />
      {mode === "doctor" && researchMode && (
        <>
          <ResearchFilters mode="research" onResults={handleTrials} />
          {searched && trialRows.length === 0 && (
            <div className="text-gray-600 text-sm my-2 mx-4 md:mx-4">
              No trials found. Try removing a filter, switching country, or using broader keywords.
            </div>
          )}
          {summary && (
            <div className="my-2 mx-4 text-sm p-3 rounded border bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {mode === "doctor" ? <Stethoscope size={16}/> : <Users size={16}/>}
                </div>

                <div className="flex-1 whitespace-pre-wrap">{summary}</div>

                <div className="flex items-center gap-2">
                  {stats?.recruitingCount ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                      • Recruiting: {stats.recruitingCount}
                    </span>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(summary!)}
                    className="px-2 py-1 text-xs border rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Copy summary"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Clipboard size={14}/> Copy
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDetails(s => !s)}
                    className="px-2 py-1 text-xs border rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="View details"
                  >
                    <span className="inline-flex items-center gap-1">
                      {showDetails ? <ChevronUp size={14}/> : <ChevronDown size={14}/> }
                      {showDetails ? "Hide details" : "View details"}
                    </span>
                  </button>
                </div>
              </div>

              {showDetails && stats && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Phases */}
                  <div className="rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-3 py-2 font-medium border-b dark:border-slate-700">Phases</div>
                    <ul className="px-3 py-2 space-y-1">
                      {Object.entries(stats.byPhase).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                        <li key={k} className="flex justify-between"><span>Phase {k}</span><span>{v}</span></li>
                      ))}
                      {Object.keys(stats.byPhase).length===0 && <li className="text-slate-500">—</li>}
                    </ul>
                  </div>

                  {/* Statuses */}
                  <div className="rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-3 py-2 font-medium border-b dark:border-slate-700">Statuses</div>
                    <ul className="px-3 py-2 space-y-1">
                      {Object.entries(stats.byStatus).sort((a,b)=>b[1]-a[1]).map(([k,v])=>(
                        <li key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></li>
                      ))}
                      {Object.keys(stats.byStatus).length===0 && <li className="text-slate-500">—</li>}
                    </ul>
                  </div>

                  {/* Countries */}
                  <div className="rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-3 py-2 font-medium border-b dark:border-slate-700">Top countries</div>
                    <ul className="px-3 py-2 space-y-1">
                      {Object.entries(stats.byCountry).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>(
                        <li key={k} className="flex justify-between"><span>{k}</span><span>{v}</span></li>
                      ))}
                      {Object.keys(stats.byCountry).length===0 && <li className="text-slate-500">—</li>}
                    </ul>
                  </div>

                  {/* Genes */}
                  <div className="rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-3 py-2 font-medium border-b dark:border-slate-700">Top genes</div>
                    <ul className="px-3 py-2 space-y-1">
                      {stats.genesTop.length ? stats.genesTop.map(([g,c])=>(
                        <li key={g} className="flex justify-between"><span>{g}</span><span>{c}</span></li>
                      )) : <li className="text-slate-500">—</li>}
                    </ul>
                  </div>

                  {/* Conditions */}
                  <div className="rounded border bg-white dark:bg-slate-900 dark:border-slate-700">
                    <div className="px-3 py-2 font-medium border-b dark:border-slate-700">Top conditions</div>
                    <ul className="px-3 py-2 space-y-1">
                      {stats.conditionsTop.length ? stats.conditionsTop.map(([k,c])=>(
                        <li key={k} className="flex justify-between capitalize"><span>{k}</span><span>{c}</span></li>
                      )) : <li className="text-slate-500">—</li>}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
          {trialRows.length > 0 && (
            <div className="mx-4 md:mx-4">
              <div className="flex justify-end mb-2">
                <button
                  onClick={async ()=>{
                    const res = await fetch("/api/trials/export", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ rows: trialRows }) });
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "trials.csv"; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-2 py-1 text-xs border rounded"
                >
                  Export CSV
                </button>
              </div>
              <TrialsTable rows={trialRows} />
            </div>
          )}
        </>
      )}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-28"
      >
        {showDefaultSuggestions && showSuggestions && (
          <ChatSuggestions suggestions={defaultSuggestions} onSelect={handleSuggestionPick} />
        )}
        {ui.topic && (
          <div className="mx-auto mb-2 max-w-3xl px-4 sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800">
              <span className="opacity-70">Topic:</span>
              <strong className="truncate max-w-[16rem]">{ui.topic}</strong>
              <button onClick={() => setUi(prev => ({ ...prev, topic: null }))} className="opacity-60 hover:opacity-100">Clear</button>
            </div>
          </div>
        )}
        {ui.contextFrom && (
          <div className="mx-auto mb-2 max-w-3xl px-4 sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800">
              <span className="opacity-70">Using context from:</span>
              <strong>{ui.contextFrom}</strong>
              <button onClick={() => { clearContext(); setUi(prev => ({ ...prev, contextFrom: null })); }} className="opacity-60 hover:opacity-100">Clear</button>
            </div>
          </div>
        )}
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {renderedMessages}
      </div>
      {AIDOC_UI && aidoc && (
        <div className="mx-auto w-full max-w-3xl">
          <div className="mt-3 rounded-lg border p-3 space-y-2">
            <div className="text-sm font-medium">Observations</div>
            <div className="text-sm opacity-90">
              {labSummaryCard ? (
                <ChatMarkdown content={labSummaryCard} />
              ) : (
                <ChatMarkdown content={NO_LABS_MESSAGE} />
              )}
            </div>

            {Array.isArray(aidoc?.plan?.steps) && aidoc.plan.steps.length > 0 && (
              <>
                <div className="text-sm font-medium mt-2">Plan</div>
                <ul className="list-disc pl-5 space-y-1">
                  {aidoc.plan.steps.map((s: string, i: number) => (
                    <li key={i} className="text-sm">{s}</li>
                  ))}
                </ul>
              </>
            )}

            {/* Show alerts from both the top level and plan, deduplicated */}
            {softAlerts.length > 0 && (
              <div className="mt-2 rounded-md border border-red-300 p-2">
                <div className="text-sm font-semibold text-red-700">Important</div>
                <ul className="list-disc pl-5 text-red-800">
                  {softAlerts.map((a: string, i: number) => (
                    <li key={i} className="text-sm">{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(aidoc?.rulesFired) && aidoc.rulesFired.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">Why these?</summary>
                <ul className="list-disc pl-5">
                  {aidoc.rulesFired.map((r: string, i: number) => (
                    <li key={i} className="text-xs opacity-70">{r}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}
      {pendingCommitIds.length > 0 && (
        <div className="mx-auto my-4 max-w-3xl px-4 sm:px-6">
          <div className="rounded-lg border p-3 text-sm flex items-center gap-2 bg-white dark:bg-gray-800">
            <span>Add this to your Medical Profile?</span>
            {commitError && <span className="text-xs text-rose-600">{commitError}</span>}
            <button
              onClick={async () => {
                setCommitBusy('save');
                setCommitError(null);
                try {
                  for (const id of pendingCommitIds) {
                    const res = await fetch('/api/observations/commit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id }),
                    });
                    if (!res.ok) throw new Error('commit');
                  }
                  setPendingCommitIds([]);
                  window.dispatchEvent(new Event('observations-updated'));
                } catch {
                  setCommitError('Could not save. Are you signed in?');
                } finally {
                  setCommitBusy(null);
                }
              }}
              disabled={commitBusy !== null}
              className="text-xs px-2 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed"
            >{commitBusy === 'save' ? 'Saving…' : 'Save'}</button>
            <button
              onClick={async () => {
                setCommitBusy('discard');
                setCommitError(null);
                try {
                  for (const id of pendingCommitIds) {
                    const res = await fetch('/api/observations/discard', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id }),
                    });
                    if (!res.ok) throw new Error('discard');
                  }
                  setPendingCommitIds([]);
                  window.dispatchEvent(new Event('observations-updated'));
                } catch {
                  setCommitError('Could not discard. Are you signed in?');
                } finally {
                  setCommitBusy(null);
                }
              }}
              disabled={commitBusy !== null}
              className="text-xs px-2 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed"
            >{commitBusy === 'discard' ? 'Discarding…' : 'Discard'}</button>
          </div>
        </div>
      )}
    </div>
  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <div className="w-full max-w-3xl px-4">
      {mode === 'doctor' && AIDOC_UI && (
        <button
          className="rounded-md px-3 py-1 border mb-2"
          onClick={async () => {
            if (AIDOC_PREFLIGHT) {
              setShowPatientChooser(true);
            } else {
              runAiDocWith('current');
            }
          }}
          aria-label="AI Doc Next Steps"
          disabled={loadingAidoc}
        >
          {loadingAidoc ? 'Analyzing…' : 'Next steps (AI Doc)'}
        </button>
      )}
      {showLiveSuggestions && (
        <SuggestBar
          title="Suggestions"
          suggestions={liveSuggestions}
          onPick={handleSuggestionPick}
          className="rounded-2xl border border-zinc-200 bg-white/90 p-3 backdrop-blur dark:border-zinc-700 dark:bg-slate-900/80"
        />
      )}
      <form
        onSubmit={e => {
          e.preventDefault();
          onSubmit();
        }}
            className="w-full flex items-center gap-3 rounded-full medx-glass px-3 py-2"
          >
            <label
              className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md medx-surface text-medx"
              title="Upload PDF or image"
            >
              <Paperclip size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Upload</span>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) onFileSelected(f);
                  e.currentTarget.value = '';
                }}
              />
            </label>
            {pendingFile && (
              <div className="flex items-center gap-2 rounded-full bg-white/70 dark:bg-gray-800/70 px-3 py-1 text-xs">
                <span className="truncate max-w-[8rem]">{pendingFile.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  aria-label="Remove file"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="relative flex-1">
              <textarea
                ref={inputRef as unknown as RefObject<HTMLTextAreaElement>}
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none text-sm md:text-base leading-6 placeholder:text-slate-500 dark:placeholder:text-slate-400 px-2 pr-[44px] text-medx"
                placeholder={
                  pendingFile
                    ? 'Add a note or question for this document (optional)'
                    : 'Send a message'
                }
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={(e) => {
                  const next = e.relatedTarget as HTMLElement | null;
                  if (next?.dataset?.suggestionButton === 'true') {
                    return;
                  }
                  setInputFocused(false);
                }}
                onKeyDown={(e) => {
                  // Send on Enter (no Shift), allow newline on Shift+Enter.
                  // Respect IME composition (don't send while composing).
                  // NOTE: keep behavior identical to ChatGPT.
                  const isComposing = (e.nativeEvent as any).isComposing;
                  if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
              />

              {busy && (
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                  <StopButton
                    onClick={onStop}
                    className="pointer-events-auto"
                    title="Stop (Esc)"
                  />
                </div>
              )}
            </div>

              {!busy && (
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg medx-btn-accent disabled:opacity-50"
                  type="submit"
                  disabled={!pendingFile && !userText.trim()}
                  aria-label="Send"
                  title="Send"
                >
                  <Send size={16} />
                </button>
              )}
          </form>
        </div>
      </div>
      {/* Preflight chooser (flagged) */}
      {AIDOC_UI && AIDOC_PREFLIGHT && showPatientChooser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <div className="text-sm font-medium mb-3">Who is this about?</div>
            {activeProfileId ? (
              <button
                className="w-full rounded-md border px-3 py-2 text-sm mb-2"
                onClick={() => runAiDocWith('current')}
              >
                Use existing profile: <span className="font-semibold">{activeProfileName}</span>
              </button>
            ) : null}
            <button
              className="w-full rounded-md border px-3 py-2 text-sm"
              onClick={() => { setShowNewIntake(true); setShowPatientChooser(false); }}
            >
              New patient
            </button>
            <div className="mt-3 text-xs opacity-70">You can switch later from Medical Profile.</div>
          </div>
        </div>
      )}

      {/* Mini intake for NEW patient (flagged) */}
      {AIDOC_UI && AIDOC_PREFLIGHT && showNewIntake && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl space-y-2">
            <div className="text-sm font-medium">New patient – quick intake</div>
            <input className="w-full rounded border px-2 py-1 text-sm" placeholder="Name"
                   value={intake.name} onChange={e => setIntake(s => ({...s, name: e.target.value}))}/>
            <div className="grid grid-cols-3 gap-2">
              <input className="rounded border px-2 py-1 text-sm" placeholder="Age"
                     value={intake.age} onChange={e => setIntake(s => ({...s, age: e.target.value}))}/>
              <select className="rounded border px-2 py-1 text-sm" value={intake.sex}
                      onChange={e => setIntake(s => ({...s, sex: e.target.value}))}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
              <select className="rounded border px-2 py-1 text-sm" value={intake.pregnant}
                      onChange={e => setIntake(s => ({...s, pregnant: e.target.value}))}>
                <option value="">Pregnant?</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <textarea className="w-full rounded border px-2 py-1 text-sm" rows={2}
                      placeholder="Key symptoms (e.g., fatigue, chest pain at rest)"
                      value={intake.symptoms} onChange={e => setIntake(s => ({...s, symptoms: e.target.value}))}/>
            <input className="w-full rounded border px-2 py-1 text-sm" placeholder="Current meds (name + dose)"
                   value={intake.meds} onChange={e => setIntake(s => ({...s, meds: e.target.value}))}/>
            <input className="w-full rounded border px-2 py-1 text-sm" placeholder="Allergies (e.g., penicillin)"
                   value={intake.allergies} onChange={e => setIntake(s => ({...s, allergies: e.target.value}))}/>
            <div className="flex gap-2 pt-1">
              <button className="flex-1 rounded-md border px-3 py-2 text-sm"
                      onClick={() => setShowNewIntake(false)}>Cancel</button>
              <button className="flex-1 rounded-md border px-3 py-2 text-sm font-medium"
                      onClick={() => runAiDocWith('new', intake)}>Start</button>
            </div>
          </div>
        </div>
      )}

      <ComposerFocus suggestions={lastSuggestions} composerRef={inputRef} />
      <ScrollToBottom targetRef={chatRef} rebindKey={threadId} />
    </div>
  );
}
