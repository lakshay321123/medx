"use client";
import { useState, useCallback } from "react";
import { BRAND_NAME } from "@/lib/brand";

type OnboardingData = {
  full_name: string;
  dob: string;
  sex: string;
  chronic_conditions: string[];
};

const CONDITIONS = [
  "Diabetes", "Hypertension", "Asthma", "Heart Disease", "Thyroid",
  "PCOS/PCOD", "Arthritis", "Migraine", "Anxiety/Depression", "None"
];

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    full_name: "", dob: "", sex: "", chronic_conditions: []
  });
  const [saving, setSaving] = useState(false);

  const canProceed = step === 0 ? data.full_name.trim().length > 1
    : step === 1 ? data.dob && data.sex
    : step === 2 ? true
    : false;

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = { full_name: data.full_name.trim() };
      if (data.dob) body.dob = data.dob;
      if (data.sex) body.sex = data.sex;
      if (data.chronic_conditions.length && !data.chronic_conditions.includes("None")) {
        body.chronic_conditions = data.chronic_conditions;
      }
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onComplete();
    } catch (err) {
      console.warn('[Onboarding] Profile save failed:', err);
      onComplete(); // don't block on error
    } finally {
      setSaving(false);
    }
  }, [data, onComplete]);

  const toggleCondition = (c: string) => {
    setData(prev => {
      if (c === "None") return { ...prev, chronic_conditions: ["None"] };
      const without = prev.chronic_conditions.filter(x => x !== "None");
      return {
        ...prev,
        chronic_conditions: without.includes(c) ? without.filter(x => x !== c) : [...without, c]
      };
    });
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Setup your health profile" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl bg-[var(--so-bg,#fff)] dark:bg-[var(--so-bg,#000)] border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-6 shadow-xl">
        
        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[var(--so-accent,#06B6D4)]" : "bg-[var(--so-border,#E5E5EA)] dark:bg-[var(--so-border,#2C2C2E)]"}`} />
          ))}
        </div>

        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-1">
              Welcome to {BRAND_NAME}
            </h2>
            <p className="text-sm text-[var(--so-text-secondary,#8E8E93)] mb-6">
              Let&apos;s set up your health profile for personalized guidance.
            </p>
            <label className="block text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-2">
              What should we call you?
            </label>
            <input
              type="text"
              value={data.full_name}
              onChange={e => setData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Your name"
              autoFocus
              className="w-full rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-4 py-3 text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] focus:border-[var(--so-accent,#06B6D4)] focus:outline-none"
            />
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-1">
              Basic details
            </h2>
            <p className="text-sm text-[var(--so-text-secondary,#8E8E93)] mb-6">
              This helps us give age and sex-appropriate guidance.
            </p>
            <label className="block text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-2">
              Date of birth
            </label>
            <input
              type="date"
              value={data.dob}
              max={new Date().toISOString().split("T")[0]}
              onChange={e => setData(prev => ({ ...prev, dob: e.target.value }))}
              className="w-full rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] bg-transparent px-4 py-3 text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] focus:border-[var(--so-accent,#06B6D4)] focus:outline-none mb-4"
            />
            <label className="block text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-2">
              Biological sex
            </label>
            <div className="flex gap-2">
              {["male", "female", "other"].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setData(prev => ({ ...prev, sex: s }))}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium capitalize transition ${
                    data.sex === s
                      ? "border-[var(--so-accent,#06B6D4)] bg-[rgba(6,182,212,0.08)] text-[var(--so-accent,#06B6D4)]"
                      : "border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] text-[var(--so-text-secondary,#8E8E93)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-1">
              Any existing conditions?
            </h2>
            <p className="text-sm text-[var(--so-text-secondary,#8E8E93)] mb-4">
              Select all that apply. You can update this later.
            </p>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCondition(c)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    data.chronic_conditions.includes(c)
                      ? "border-[var(--so-accent,#06B6D4)] bg-[rgba(6,182,212,0.08)] text-[var(--so-accent,#06B6D4)]"
                      : "border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] text-[var(--so-text-secondary,#8E8E93)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex-1 rounded-xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] py-2.5 text-sm font-medium text-[var(--so-text-secondary,#8E8E93)]"
            >
              Back
            </button>
          )}
          {step === 0 && (
            <button
              type="button"
              onClick={onComplete}
              className="text-sm text-[var(--so-text-secondary,#8E8E93)] hover:underline"
            >
              Skip for now
            </button>
          )}
          <button
            type="button"
            disabled={!canProceed || saving}
            onClick={() => step < 2 ? setStep(s => s + 1) : save()}
            className="flex-1 rounded-xl bg-[var(--so-accent,#06B6D4)] py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition hover:opacity-90"
          >
            {saving ? "Saving\u2026" : step < 2 ? "Continue" : "Get Started"}
          </button>
        </div>
      </div>
    </div>
  );
}
