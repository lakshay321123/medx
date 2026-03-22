"use client";
import ChatMarkdown from "@/components/ChatMarkdown";
import type { PendingAssistantStage } from "@/hooks/usePendingAssistantStages";
import type { FormatId } from "@/lib/formats/types";
import { useState, useEffect, useRef } from "react";

const PENDING_CONTAINER = "rounded-2xl p-4 text-left whitespace-normal max-w-3xl min-h-[48px] bg-[var(--so-card,#fff)] border border-[var(--so-border,#E5E5EA)] dark:bg-[var(--so-card,#1C1C1E)] dark:border-[var(--so-border,#2C2C2E)]";

type Props = {
  stage: PendingAssistantStage;
  analyzingPhrase: string | null;
  thinkingLabel?: string | null;
  content: string;
  formatId?: FormatId;
  userPrompt?: string;
};

// Generate reasoning steps based on user query
function generateSteps(userPrompt?: string): string[] {
  const q = (userPrompt || "").toLowerCase();
  const steps: string[] = [];
  
  steps.push("Understanding your question");
  
  if (/symptom|pain|ache|fever|cough|rash|swell|dizz|nausea/.test(q)) {
    steps.push("Reviewing symptom patterns and causes");
    steps.push("Checking clinical guidelines");
  } else if (/diet|nutrition|calorie|protein|carb|fat|meal|food|eat/.test(q)) {
    steps.push("Reviewing nutritional evidence");
    steps.push("Checking recommended values");
  } else if (/supplement|creatine|whey|vitamin|mineral/.test(q)) {
    steps.push("Checking supplement research");
    steps.push("Reviewing dosage and safety data");
  } else if (/sleep|insomnia|stress|anxiety|mental/.test(q)) {
    steps.push("Reviewing sleep and mental health research");
    steps.push("Checking evidence-based interventions");
  } else if (/exercise|workout|training|fitness|run/.test(q)) {
    steps.push("Reviewing exercise science");
    steps.push("Checking activity guidelines");
  } else if (/lab|test|blood|report|scan|result/.test(q)) {
    steps.push("Analyzing lab values");
    steps.push("Checking reference ranges");
  } else if (/hair|skin|acne|weight|lose|gain/.test(q)) {
    steps.push("Reviewing medical literature");
    steps.push("Checking what evidence supports");
  } else {
    steps.push("Searching medical knowledge base");
    steps.push("Reviewing guidelines");
  }
  
  steps.push("Identifying what works vs myths");
  steps.push("Preparing your answer");
  
  return steps;
}

function SingleLineReasoning({ userPrompt }: { userPrompt?: string }) {
  const steps = useRef(generateSteps(userPrompt)).current;
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    if (currentStep >= steps.length - 1) return; // stay on last step (it blinks)
    
    // Timing: spread steps across ~8-15 seconds total
    // First step shows immediately, then each subsequent step after 2-4 seconds
    const delay = currentStep === 0 ? 2000 : 2500 + Math.random() * 1500;
    
    const timer = setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }, delay);
    
    return () => clearTimeout(timer);
  }, [currentStep, steps]);
  
  const isLast = currentStep === steps.length - 1;
  const text = steps[currentStep];
  
  return (
    <div className="flex items-center gap-2.5 text-[14px] min-h-[24px]">
      {isLast ? (
        <span className="flex gap-[3px] shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--so-accent,#06B6D4)] animate-[pulse_1.2s_ease-in-out_infinite]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--so-accent,#06B6D4)] animate-[pulse_1.2s_ease-in-out_infinite_0.2s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--so-accent,#06B6D4)] animate-[pulse_1.2s_ease-in-out_infinite_0.4s]" />
        </span>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[var(--so-accent,#06B6D4)] shrink-0 animate-spin">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25"/>
          <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      <span 
        key={currentStep}
        className="text-[var(--so-text-secondary,#8E8E93)] dark:text-[var(--so-text-secondary,#98989D)] animate-[fadeIn_0.3s_ease-in]"
      >
        {text}
      </span>
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
      <SingleLineReasoning userPrompt={userPrompt} />
    </div>
  );
}
