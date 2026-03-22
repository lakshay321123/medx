"use client";
import ChatMarkdown from "@/components/ChatMarkdown";
import type { PendingAssistantStage } from "@/hooks/usePendingAssistantStages";
import type { FormatId } from "@/lib/formats/types";
import { useState, useEffect } from "react";

const PENDING_CONTAINER = "rounded-2xl p-4 text-left whitespace-normal max-w-3xl min-h-[48px] bg-[var(--so-card,#fff)] border border-[var(--so-border,#E5E5EA)] dark:bg-[var(--so-card,#1C1C1E)] dark:border-[var(--so-border,#2C2C2E)]";

type Props = {
  stage: PendingAssistantStage;
  analyzingPhrase: string | null;
  thinkingLabel?: string | null;
  content: string;
  formatId?: FormatId;
  userPrompt?: string;
};

function stripTrailingEllipsis(value: string) {
  if (!value) return value;
  const trimmed = value.trimEnd();
  const withoutEllipsis = trimmed.replace(/(?:\u2026|\.{3})\s*$/u, "").trimEnd();
  return withoutEllipsis.length > 0 ? withoutEllipsis : trimmed;
}

// Generate reasoning steps based on user query
function generateReasoningSteps(userPrompt?: string): string[] {
  const q = (userPrompt || "").toLowerCase();
  const steps: string[] = [];
  
  // Step 1: Always start with understanding
  steps.push("Understanding your question");
  
  // Step 2: Topic-specific research
  if (/symptom|pain|ache|fever|cough|rash|swell|dizz|nausea/.test(q)) {
    steps.push("Reviewing symptom patterns and differential causes");
    steps.push("Checking clinical guidelines for assessment");
  } else if (/diet|nutrition|calorie|protein|carb|fat|meal|food|eat/.test(q)) {
    steps.push("Reviewing nutritional evidence and guidelines");
    steps.push("Checking recommended intake values");
  } else if (/supplement|creatine|whey|vitamin|mineral/.test(q)) {
    steps.push("Checking supplement research and safety data");
    steps.push("Reviewing dosage guidelines and evidence quality");
  } else if (/sleep|insomnia|stress|anxiety|mental/.test(q)) {
    steps.push("Reviewing sleep/mental health research");
    steps.push("Checking evidence-based interventions");
  } else if (/exercise|workout|training|fitness|run/.test(q)) {
    steps.push("Reviewing exercise science evidence");
    steps.push("Checking recommended activity guidelines");
  } else if (/lab|test|blood|report|scan|result/.test(q)) {
    steps.push("Analyzing lab values and reference ranges");
    steps.push("Checking clinical significance");
  } else if (/hair|skin|acne|weight|lose|gain/.test(q)) {
    steps.push("Reviewing medical literature on this topic");
    steps.push("Checking what evidence supports");
  } else {
    steps.push("Searching medical knowledge base");
    steps.push("Reviewing relevant guidelines");
  }
  
  // Step 3: Always end with evidence check
  steps.push("Identifying what works vs common myths");
  steps.push("Preparing evidence-backed answer");
  
  return steps;
}

function ReasoningSteps({ userPrompt }: { userPrompt?: string }) {
  const steps = generateReasoningSteps(userPrompt);
  const [activeStep, setActiveStep] = useState(0);
  
  useEffect(() => {
    if (activeStep >= steps.length) return;
    const timer = setTimeout(() => {
      setActiveStep(prev => Math.min(prev + 1, steps.length));
    }, 600 + Math.random() * 400); // 600-1000ms per step
    return () => clearTimeout(timer);
  }, [activeStep, steps.length]);
  
  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 text-[13px] transition-opacity duration-300 ${
            i < activeStep ? "opacity-100" : i === activeStep ? "opacity-70" : "opacity-0"
          }`}
        >
          {i < activeStep ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--so-accent,#06B6D4)] shrink-0">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : i === activeStep ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[var(--so-accent,#06B6D4)] shrink-0 animate-spin">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
              <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <div className="w-3.5 h-3.5 rounded-full border border-[var(--so-border,#E5E5EA)] shrink-0" />
          )}
          <span className={i < activeStep ? "text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]" : "text-[var(--so-text-secondary,#8E8E93)]"}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AssistantPendingMessage({ stage, analyzingPhrase, thinkingLabel, content, formatId, userPrompt }: Props) {
  if (stage === "streaming") {
    return (
      <div className={PENDING_CONTAINER}>
        <ChatMarkdown content={content || ""} formatId={formatId} userPrompt={userPrompt} />
      </div>
    );
  }

  return (
    <div className={PENDING_CONTAINER} aria-live="polite">
      <ReasoningSteps userPrompt={userPrompt} />
    </div>
  );
}
