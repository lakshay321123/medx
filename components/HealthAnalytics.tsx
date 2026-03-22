"use client";
import { useEffect, useState, useRef } from "react";
import { Activity, Heart, Droplets, Brain, TrendingUp, TrendingDown, Minus, Zap, FlaskConical, Pill, Eye } from "lucide-react";

type VitalPoint = { date: string; value: number };
type LabPanel = { name: string; items: { test: string; value: number; unit: string; date: string; ref?: string; status: "normal" | "high" | "low" | "unknown" }[] };

// ─── Animated Score Ring ─────────────────────────
function AnimatedScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const [animated, setAnimated] = useState(0);
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setAnimated(Math.round(score * eased));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const offset = circ - (animated / 100) * circ;
  const color = animated >= 70 ? "#34C759" : animated >= 40 ? "#FF9500" : "#FF3B30";
  const bgGlow = animated >= 70 ? "rgba(52,199,89,0.1)" : animated >= 40 ? "rgba(255,149,0,0.1)" : "rgba(255,59,48,0.1)";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size, filter: `drop-shadow(0 0 20px ${bgGlow})` }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--so-border, #E5E5EA)" strokeWidth="10" opacity="0.3" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.05s linear" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{animated}</span>
          <span className="text-[10px] text-[var(--so-text-secondary,#8E8E93)]">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">Overall Health Score</span>
    </div>
  );
}

// ─── ECG-style Animated Line ─────────────────────
function ECGAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width = 280;
    const h = canvas.height = 60;
    let x = 0;
    const ecgPattern = [0,0,0,0,0,2,-2,0,0,0,0,12,-18,20,-4,0,0,0,0,3,-3,0,0,0,0,0,0,0,0,0];

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "#06B6D4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < w; i++) {
        const idx = (x + i) % ecgPattern.length;
        const y = h / 2 - ecgPattern[idx] * 1.5;
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();

      // Glow dot at leading edge
      const leadIdx = (x + w - 1) % ecgPattern.length;
      const leadY = h / 2 - ecgPattern[leadIdx] * 1.5;
      ctx.fillStyle = "#06B6D4";
      ctx.shadowColor = "#06B6D4";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(w - 1, leadY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      x = (x + 1) % ecgPattern.length;
      requestAnimationFrame(draw);
    };
    const frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-[60px] opacity-80" />;
}

// ─── Animated Sparkline Card ─────────────────────
function MetricCard({ data, color, label, unit, icon: Icon, refRange }: {
  data: VitalPoint[]; color: string; label: string; unit: string; icon: any; refRange?: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 100); return () => clearTimeout(t); }, []);

  if (!data.length) return null;
  const latest = data[0];
  const prev = data.length > 1 ? data[1] : null;
  const trend = prev ? (latest.value > prev.value ? "up" : latest.value < prev.value ? "down" : "flat") : "flat";
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#FF3B30" : trend === "down" ? "#34C759" : "#8E8E93";

  // SVG sparkline
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const pts = data.slice(0, 12).reverse();
  const path = pts.map((d, i) => {
    const x = (i / Math.max(pts.length - 1, 1)) * 120;
    const y = 36 - ((d.value - min) / range) * 30;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");
  const areaPath = path + ` L120,40 L0,40 Z`;

  return (
    <div className={`rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4 transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="text-xs font-medium text-[var(--so-text-secondary,#8E8E93)]">{label}</span>
        </div>
        <TrendIcon className="h-3.5 w-3.5" style={{ color: trendColor }} />
      </div>
      <div className="flex items-end gap-1.5 mb-2">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>{latest.value}</span>
        <span className="text-xs text-[var(--so-text-secondary,#8E8E93)] mb-0.5">{unit}</span>
      </div>
      <svg viewBox="0 0 120 40" className="w-full h-10" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${label})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <animate attributeName="stroke-dashoffset" from="300" to="0" dur="1.5s" fill="freeze" />
          <animate attributeName="stroke-dasharray" from="0 300" to="300 0" dur="1.5s" fill="freeze" />
        </path>
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-[var(--so-text-secondary,#8E8E93)]">
          {latest.date ? new Date(latest.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
        </span>
        {refRange && <span className="text-[10px] text-[var(--so-text-secondary,#8E8E93)]">Ref: {refRange}</span>}
      </div>
    </div>
  );
}

// ─── Lab Panel Card ──────────────────────────────
function LabPanelCard({ panel }: { panel: LabPanel }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-[var(--so-accent,#06B6D4)]" />
          <span className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">{panel.name}</span>
          <span className="rounded-full bg-[rgba(6,182,212,0.1)] px-2 py-0.5 text-[10px] font-medium text-[var(--so-accent,#06B6D4)]">{panel.items.length} tests</span>
        </div>
        <svg className={`h-4 w-4 text-[var(--so-text-secondary,#8E8E93)] transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)]">
          {panel.items.map((item, i) => {
            const statusColor = item.status === "high" ? "text-red-500" : item.status === "low" ? "text-amber-500" : "text-emerald-500";
            return (
              <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? "border-t border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] border-opacity-50" : ""}`}>
                <div>
                  <span className="text-xs font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">{item.test}</span>
                  {item.ref && <span className="ml-2 text-[10px] text-[var(--so-text-secondary,#8E8E93)]">({item.ref})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold tabular-nums ${statusColor}`}>{item.value}</span>
                  <span className="text-[10px] text-[var(--so-text-secondary,#8E8E93)]">{item.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Analytics Component ────────────────────
export default function HealthAnalytics() {
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [vitals, setVitals] = useState<Record<string, VitalPoint[]>>({});
  const [labPanels, setLabPanels] = useState<LabPanel[]>([]);
  const [predictions, setPredictions] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, scoreRes] = await Promise.all([
          fetch("/api/profile", { credentials: "include" }).then(r => r.json()),
          fetch("/api/health-score?userId=me", { credentials: "include" }).then(r => r.json()).catch(() => null),
        ]);

        setScore(scoreRes?.overall_score ?? null);
        setPredictions(scoreRes?.recommendations || []);

        const groups = profileRes?.groups || {};
        const allVitals = groups.vitals || [];
        const allLabs = groups.labs || [];

        // Build vital trends
        const vitalMap: Record<string, VitalPoint[]> = {};
        const vitalKeys = ["bp", "bp_systolic", "hr", "heart_rate", "bmi", "spo2", "temp"];
        for (const v of allVitals) {
          const k = v.key;
          if (!vitalMap[k]) vitalMap[k] = [];
          if (v.value != null && !isNaN(Number(v.value))) {
            vitalMap[k].push({ date: v.observedAt, value: Number(v.value) });
          }
        }
        setVitals(vitalMap);

        // Build lab panels
        const panelMap: Record<string, LabPanel> = {
          "Complete Blood Count": { name: "Complete Blood Count (CBC)", items: [] },
          "Metabolic Panel": { name: "Metabolic Panel", items: [] },
          "Lipid Profile": { name: "Lipid Profile", items: [] },
          "Liver Function": { name: "Liver Function Tests", items: [] },
          "Thyroid Panel": { name: "Thyroid Panel", items: [] },
          "Vitamins & Minerals": { name: "Vitamins & Minerals", items: [] },
          "Diabetes": { name: "Diabetes Markers", items: [] },
          "Kidney Function": { name: "Kidney Function", items: [] },
          "Other": { name: "Other Labs", items: [] },
        };

        const labRouting: Record<string, string> = {
          hemoglobin: "Complete Blood Count", wbc: "Complete Blood Count", platelets: "Complete Blood Count",
          rbc_count: "Complete Blood Count", esr: "Complete Blood Count",
          fasting_glucose: "Diabetes", hba1c: "Diabetes",
          total_cholesterol: "Lipid Profile", ldl: "Lipid Profile", hdl: "Lipid Profile", triglycerides: "Lipid Profile",
          alt: "Liver Function", ast: "Liver Function", alp: "Liver Function", ggt: "Liver Function",
          total_bilirubin: "Liver Function", direct_bilirubin: "Liver Function",
          creatinine: "Kidney Function", egfr: "Kidney Function",
          vitamin_d: "Vitamins & Minerals", vitamin_b12: "Vitamins & Minerals",
          tsh: "Thyroid Panel", t3: "Thyroid Panel", t4: "Thyroid Panel", free_t4: "Thyroid Panel",
        };

        for (const l of allLabs) {
          const panel = labRouting[l.key] || "Other";
          if (!panelMap[panel]) panelMap[panel] = { name: panel, items: [] };
          panelMap[panel].items.push({
            test: l.label || l.key,
            value: Number(l.value),
            unit: l.unit || "",
            date: l.observedAt?.split("T")[0] || "",
            status: "unknown" as const,
          });
        }

        setLabPanels(Object.values(panelMap).filter(p => p.items.length > 0));
      } catch (err) {
        console.error("Analytics load failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center py-8"><div className="h-36 w-36 animate-pulse rounded-full bg-[var(--so-border,#E5E5EA)]" /></div>
        <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-[var(--so-border,#E5E5EA)]" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ECG Animation Banner */}
      <div className="rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-[var(--so-accent,#06B6D4)]" />
          <span className="text-xs font-medium text-[var(--so-text-secondary,#8E8E93)]">Heart Activity</span>
        </div>
        <ECGAnimation />
      </div>

      {/* Health Score */}
      <div className="flex justify-center py-4">
        {score != null ? (
          <AnimatedScoreRing score={score} />
        ) : (
          <div className="text-center py-6">
            <Activity className="h-12 w-12 mx-auto mb-3 text-[var(--so-border,#E5E5EA)]" />
            <p className="text-sm text-[var(--so-text-secondary,#8E8E93)]">Upload a report to see your health score</p>
          </div>
        )}
      </div>

      {/* Vitals Grid */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-3 flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500" /> Vitals
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard data={vitals.bp_systolic || vitals.bp || []} color="#EF4444" label="Blood Pressure" unit="mmHg" icon={Heart} refRange="90-120" />
          <MetricCard data={vitals.heart_rate || vitals.hr || []} color="#8B5CF6" label="Heart Rate" unit="bpm" icon={Activity} refRange="60-100" />
          <MetricCard data={vitals.bmi || []} color="#06B6D4" label="BMI" unit="kg/m\u00B2" icon={Activity} refRange="18.5-24.9" />
          <MetricCard data={vitals.spo2 || []} color="#34C759" label="SpO2" unit="%" icon={Droplets} refRange=">95" />
        </div>
      </div>

      {/* Lab Panels */}
      {labPanels.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-3 flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-[var(--so-accent,#06B6D4)]" /> Lab Results
          </h2>
          <div className="space-y-3">
            {labPanels.map(p => <LabPanelCard key={p.name} panel={p} />)}
          </div>
        </div>
      )}

      {/* AI Predictions */}
      {predictions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-500" /> AI Predictions & Recommendations
          </h2>
          <div className="space-y-2">
            {predictions.slice(0, 8).map((p, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-3.5 transition-all duration-500"
                style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-500/10 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                  {i + 1}
                </div>
                <p className="text-xs text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)] leading-relaxed">
                  {typeof p === "string" ? p : JSON.stringify(p)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for labs */}
      {labPanels.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] p-8 text-center">
          <FlaskConical className="h-8 w-8 mx-auto mb-3 text-[var(--so-text-secondary,#8E8E93)]" />
          <p className="text-sm font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">No lab results yet</p>
          <p className="text-xs text-[var(--so-text-secondary,#8E8E93)] mt-1">Upload a blood test report from your Medical Profile to see your full lab analytics here.</p>
        </div>
      )}
    </div>
  );
}
