"use client";

import { usePrefsDraft } from "@/components/providers/PrefsDraftProvider";

const PILL =
  "px-3 py-1.5 text-sm rounded-full border border-slate-200 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5";
const LABEL = "text-xs uppercase tracking-wide opacity-60";
const ROW =
  "rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4 shadow-sm backdrop-blur";

export default function PersonalizationPanel() {
  const { draft, set } = usePrefsDraft();

  const personality = ((draft.personality as string) ?? "nerd") as string;
  const personalizationEnabled = Boolean(draft.personalizationEnabled ?? true);

  return (
    <div className="space-y-4 p-4 text-sm">
      <div className={ROW}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Enable customization</div>
            <div className="text-xs opacity-70">Customize how the assistant responds to you.</div>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={personalizationEnabled}
              onChange={(event) => set("personalizationEnabled", event.target.checked)}
              aria-label="Enable customization"
            />
            <span>{personalizationEnabled ? "On" : "Off"}</span>
          </label>
        </div>
      </div>

      <div className={ROW}>
        <div className="font-medium">ChatGPT personality</div>
        <div className="mb-3 text-xs opacity-70">Style and tone when responding.</div>
        <div className="flex flex-wrap gap-2">
          {[
            ["nerd", "Nerd"],
            ["chatty", "Chatty"],
            ["witty", "Witty"],
            ["straight", "Straight shooting"],
            ["encouraging", "Encouraging"],
            ["genz", "Gen Z"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => set("personality", key)}
              className={`${PILL} ${personality === key ? "bg-blue-600 text-white border-blue-600" : ""}`}
              aria-pressed={personality === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={ROW}>
        <div className="font-medium">Custom instructions</div>
        <textarea
          className="w-full rounded-lg border border-slate-200 bg-transparent p-2 outline-none dark:border-white/10"
          rows={3}
          value={(draft.customInstructions as string) ?? ""}
          onChange={(event) => set("customInstructions", event.target.value)}
          placeholder="Be innovative and think outside the box."
          aria-label="Custom instructions"
        />
      </div>

      <div className={ROW}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className={LABEL}>Nickname</div>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent p-2 outline-none dark:border-white/10"
              value={(draft.nickname as string) ?? ""}
              onChange={(event) => set("nickname", event.target.value)}
              placeholder="What should we call you?"
              aria-label="Nickname"
            />
          </div>
          <div>
            <div className={LABEL}>Occupation</div>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent p-2 outline-none dark:border-white/10"
              value={(draft.occupation as string) ?? ""}
              onChange={(event) => set("occupation", event.target.value)}
              placeholder="Interior designer"
              aria-label="Occupation"
            />
          </div>
        </div>
        <div className="mt-3">
          <div className={LABEL}>More about you</div>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent p-2 outline-none dark:border-white/10"
            rows={3}
            value={(draft.about as string) ?? ""}
            onChange={(event) => set("about", event.target.value)}
            placeholder="Interests, values, or preferences to keep in mind"
            aria-label="More about you"
          />
        </div>
      </div>

      <div className={ROW}>
        <div className="font-medium mb-2">Manage</div>
        <ToggleRow
          label="Reference saved memories"
          sub="Let the assistant save and use memories when responding."
          value={Boolean((draft as any)["mem.enabled"] ?? true)}
          onChange={(value) => set("mem.enabled" as any, value)}
        />
        <ToggleRow
          label="Reference chat history"
          sub="Let the assistant reference previous conversations."
          value={Boolean(draft.referenceChatHistory ?? true)}
          onChange={(value) => set("referenceChatHistory", value)}
        />
        <ToggleRow
          label="Reference record history"
          sub="Let the assistant use recording transcripts and notes."
          value={Boolean(draft.referenceRecordHistory ?? false)}
          onChange={(value) => set("referenceRecordHistory", value)}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2">
      <div>
        <div>{label}</div>
        <div className="text-xs opacity-70">{sub}</div>
      </div>
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
    </label>
  );
}
