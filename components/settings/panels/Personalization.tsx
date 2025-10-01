"use client";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { useMemoryStore } from "@/lib/memory/useMemoryStore";

const PILL =
  "px-3 py-1.5 text-sm rounded-full border border-slate-200 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5";
const LABEL = "text-xs uppercase tracking-wide opacity-60";
const ROW =
  "rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 p-4 shadow-sm backdrop-blur";

export default function PersonalizationPanel() {
  const p = usePrefs();
  const mem = useMemoryStore();

  const selectPersonality = (v: typeof p.personality) => p.set("personality", v);

  return (
    <div className="space-y-4 p-4 text-sm text-slate-700 dark:text-slate-300">
      {/* Enable customization */}
      <div className={ROW}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Enable customization</div>
            <div className="text-xs opacity-70">Customize how the assistant responds to you.</div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={p.personalizationEnabled}
              onChange={(e) => p.set("personalizationEnabled", e.target.checked)}
            />
            <span>{p.personalizationEnabled ? "On" : "Off"}</span>
          </label>
        </div>
      </div>

      {/* Personality */}
      <div className={ROW}>
        <div className="font-medium">ChatGPT personality</div>
        <div className="text-xs opacity-70 mb-3">Set the style and tone used when responding.</div>
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
              onClick={() => selectPersonality(key as any)}
              className={`${PILL} ${p.personality === key ? "bg-blue-600 text-white border-blue-600" : ""}`}
              aria-pressed={p.personality === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom instructions */}
      <div className={ROW}>
        <div className="font-medium">Custom instructions</div>
        <div className="text-xs opacity-70 mb-2">
          Tell the assistant how to behave (e.g., “Be innovative and think outside the box”).
        </div>
        <textarea
          className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-transparent p-2 outline-none"
          rows={3}
          value={p.customInstructions}
          onChange={(e) => p.set("customInstructions", e.target.value)}
          placeholder="Be innovative and think outside the box."
        />
      </div>

      {/* Profile fields */}
      <div className={ROW}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className={LABEL}>Nickname</div>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-transparent p-2 outline-none"
              value={p.nickname}
              onChange={(e) => p.set("nickname", e.target.value)}
              placeholder="What should we call you?"
            />
          </div>
          <div>
            <div className={LABEL}>Occupation</div>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-transparent p-2 outline-none"
              value={p.occupation}
              onChange={(e) => p.set("occupation", e.target.value)}
              placeholder="Interior designer"
            />
          </div>
        </div>
        <div className="mt-3">
          <div className={LABEL}>More about you</div>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-transparent p-2 outline-none"
            rows={3}
            value={p.about}
            onChange={(e) => p.set("about", e.target.value)}
            placeholder="Interests, values, or preferences to keep in mind"
          />
        </div>
      </div>

      {/* Manage */}
      <div className={ROW}>
        <div className="font-medium mb-2">Manage</div>

        {/* Reference saved memories */}
        <label className="flex items-center justify-between py-2">
          <div>
            <div>Reference saved memories</div>
            <div className="text-xs opacity-70">Let the assistant save and use memories when responding.</div>
          </div>
          <input
            type="checkbox"
            checked={mem.enabled}
            onChange={(e) => mem.setEnabled(e.target.checked)}
          />
        </label>

        {/* Reference chat history */}
        <label className="flex items-center justify-between py-2">
          <div>
            <div>Reference chat history</div>
            <div className="text-xs opacity-70">Let the assistant reference previous conversations.</div>
          </div>
          <input
            type="checkbox"
            checked={p.referenceChatHistory}
            onChange={(e) => p.set("referenceChatHistory", e.target.checked)}
          />
        </label>

        {/* Reference record history */}
        <label className="flex items-center justify-between py-2">
          <div>
            <div>Reference record history</div>
            <div className="text-xs opacity-70">Let the assistant use your recording transcripts and notes.</div>
          </div>
          <input
            type="checkbox"
            checked={p.referenceRecordHistory}
            onChange={(e) => p.set("referenceRecordHistory", e.target.checked)}
          />
        </label>

        {/* The items you *don’t* want (omitted): Web search / Code / Canvas / Advanced voice */}
      </div>
    </div>
  );
}
