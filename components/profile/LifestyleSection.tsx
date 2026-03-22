"use client";
import { useState, useEffect } from "react";
import { Cigarette, Wine, Dumbbell } from "lucide-react";

type LifestyleData = {
  smoking: string;
  alcohol: string;
  exercise: string;
  diet: string;
};

const SMOKING_OPTIONS = ["Never", "Former", "Current — occasional", "Current — daily"];
const ALCOHOL_OPTIONS = ["None", "Occasional", "Moderate (1-2/day)", "Heavy (3+/day)"];
const EXERCISE_OPTIONS = ["Sedentary", "Light (1-2x/week)", "Moderate (3-4x/week)", "Active (5+/week)"];
const DIET_OPTIONS = ["No restrictions", "Vegetarian", "Vegan", "Low-carb", "Gluten-free", "Diabetic diet"];

export default function LifestyleSection({ onSave }: { onSave?: (data: LifestyleData) => void }) {
  const [data, setData] = useState<LifestyleData>({ smoking: "", alcohol: "", exercise: "", diet: "" });

  useEffect(() => {
    const saved = localStorage.getItem("so:lifestyle");
    if (saved) setData(JSON.parse(saved));
  }, []);

  const update = (key: keyof LifestyleData, value: string) => {
    const next = { ...data, [key]: value };
    setData(next);
    localStorage.setItem("so:lifestyle", JSON.stringify(next));
    onSave?.(next);
  };

  const OptionRow = ({ label, icon: Icon, options, field }: { label: string; icon: any; options: string[]; field: keyof LifestyleData }) => (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">
        <Icon className="h-3.5 w-3.5 text-[var(--so-accent,#06B6D4)]" /> {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o} type="button" onClick={() => update(field, o)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              data[field] === o
                ? "bg-[var(--so-accent,#06B6D4)] text-white"
                : "border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] text-[var(--so-text-secondary,#8E8E93)]"
            }`}>{o}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <OptionRow label="Smoking" icon={Cigarette} options={SMOKING_OPTIONS} field="smoking" />
      <OptionRow label="Alcohol" icon={Wine} options={ALCOHOL_OPTIONS} field="alcohol" />
      <OptionRow label="Exercise" icon={Dumbbell} options={EXERCISE_OPTIONS} field="exercise" />
      <OptionRow label="Diet" icon={Dumbbell} options={DIET_OPTIONS} field="diet" />
    </div>
  );
}
