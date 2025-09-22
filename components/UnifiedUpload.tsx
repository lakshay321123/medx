"use client";
import { useRef, useState } from "react";
import { safeJson } from "@/lib/safeJson";

const MAX_VIEW_COUNT = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image

export default function UnifiedUpload() {
  const [loading, setLoading] = useState(false);
  const [doctorMode, setDoctorMode] = useState(true);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({
    openCut: false,
    numbness: false,
    severeSwelling: false,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const qualityPanelClass = (label?: string | null) => {
    if (label === "Good") return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    if (label === "Fair") return "border border-amber-200 bg-amber-50 text-amber-700";
    return "border border-rose-200 bg-rose-50 text-rose-700";
  };

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const classify = (file: File) => {
      const name = file.name?.toLowerCase() || "";
      const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
      const isImage =
        file.type.startsWith("image/") ||
        /\.(png|jpe?g|webp|bmp|gif|tif?f)$/i.test(name);
      return { isPdf, isImage };
    };

    const pdfFiles = files.filter(file => classify(file).isPdf);
    const imageFiles = files.filter(file => classify(file).isImage);

    if (pdfFiles.length && imageFiles.length) {
      setErr("Upload PDFs separately from radiograph images.");
      e.target.value = "";
      return;
    }

    if (pdfFiles.length > 1) {
      setErr("Upload a single PDF at a time.");
      e.target.value = "";
      return;
    }

    if (!pdfFiles.length && imageFiles.length > MAX_VIEW_COUNT) {
      setErr(`Upload up to ${MAX_VIEW_COUNT} images (PA, lateral, oblique).`);
      e.target.value = "";
      return;
    }

    if (imageFiles.some(file => file.size > MAX_IMAGE_BYTES)) {
      setErr("Each image must be under 5 MB.");
      e.target.value = "";
      return;
    }

    if (!pdfFiles.length && !imageFiles.length) {
      setErr("Unsupported file type. Upload DICOM/PDF/PNG/JPG.");
      e.target.value = "";
      return;
    }

    setLoading(true);
    setErr(null);
    setOut(null);

    const search = new URLSearchParams(window.location.search);
    const threadId = search.get("threadId");
    const orderedFiles = pdfFiles.length ? pdfFiles : imageFiles;
    const sourceHash = orderedFiles
      .map(file => `${file.name}:${file.size}:${(file as any).lastModified ?? ""}`)
      .join("|");

    const fd = new FormData();
    orderedFiles.forEach(file => fd.append("files[]", file));
    if (orderedFiles[0]) {
      fd.append("file", orderedFiles[0]);
    }
    fd.append("doctorMode", String(doctorMode));
    fd.append("redFlagChecklist", JSON.stringify(checklist));
    if (threadId) fd.append("threadId", threadId);
    if (sourceHash) fd.append("sourceHash", sourceHash);

    try {
      const j = await safeJson(
        fetch("/api/imaging/analyze", {
          method: "POST",
          body: fd,
        }),
      );
      setOut(j);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("observations-updated"));
      }
    } catch (e: any) {
      const message = String(e?.message || e) || "Upload failed";
      if (message.includes("415")) {
        setErr("Unsupported file type. Upload DICOM/PDF/PNG/JPG.");
      } else if (message.includes("413")) {
        setErr("Each image must be under 5 MB.");
      } else if (message.includes("Upload up to")) {
        setErr(`Upload up to ${MAX_VIEW_COUNT} images (PA, lateral, oblique).`);
      } else {
        setErr("Upload clearer image or side view.");
      }
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return null;
    const rounded = parseFloat(value.toFixed(1));
    return Number.isNaN(rounded) ? null : rounded.toString();
  };

  const warnings: string[] = Array.isArray(out?.warnings)
    ? out.warnings.filter((item: unknown) => typeof item === "string" && item.trim())
    : typeof out?.warning === "string" && out.warning.trim()
    ? [out.warning.trim()]
    : [];
  const showUploadMore =
    !loading &&
    out?.type === "image" &&
    ((out?.views && out.views.missingLateral) || out?.findings?.need_additional_views === true);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label
          className="px-4 py-2 rounded bg-black text-white cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <span>Upload</span>
          <input
            type="file"
            accept="application/pdf,image/*,.dcm"
            multiple
            onChange={onChange}
            className="hidden"
            ref={fileInputRef}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={doctorMode} onChange={e=>setDoctorMode(e.target.checked)} />
          <span>Doctor Mode</span>
        </label>
      </div>

      <p className="text-xs text-gray-500">
        (Upload medical reports, prescriptions, discharge summaries, or hand X-rays — PDF or up to 3 image views: PA, lateral, oblique.)
      </p>

      <div className="rounded border border-dashed p-3">
        <p className="text-sm font-medium">Quick injury checklist</p>
        <p className="text-xs text-gray-500">Helps surface red flags for urgent follow-up.</p>
        <div className="mt-2 grid gap-1 text-xs sm:text-sm">
          {(
            [
              { key: "openCut" as const, label: "Open cut over the injured area" },
              { key: "numbness" as const, label: "Numbness or tingling in fingers" },
              { key: "severeSwelling" as const, label: "Severe swelling or obvious deformity" },
            ] satisfies { key: keyof typeof checklist; label: string }[]
          ).map(item => (
            <label key={item.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checklist[item.key]}
                onChange={e =>
                  setChecklist(prev => ({
                    ...prev,
                    [item.key]: e.target.checked,
                  }))
                }
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {loading && <p>Analyzing…</p>}
      {err && <p className="text-red-600">⚠️ {err}</p>}

      {out && (
        <div className="space-y-3">
          {out.type === "pdf" && (
            <>
              <section className="p-3 border rounded">
                <h3 className="font-semibold mb-1">Wellness Summary</h3>
                <p className="whitespace-pre-wrap text-sm">{out.patient}</p>
              </section>
              {out.doctor && (
                <section className="p-3 border rounded">
                  <h3 className="font-semibold mb-1">Doctor Summary</h3>
                  <p className="whitespace-pre-wrap text-sm">{out.doctor}</p>
                </section>
              )}
            </>
          )}
          {out.type === "image" && (
            <section className="p-3 border rounded space-y-2">
              <h3 className="font-semibold">Imaging Findings</h3>
              {out.quality && (
                <div className={`rounded px-3 py-2 text-sm ${qualityPanelClass(out.quality.label)}`}>
                  <p className="font-medium">Quality: {out.quality.label}</p>
                  <p className="text-xs">{out.quality.tip}</p>
                </div>
              )}
              {out.views?.detected?.length ? (
                <div className="flex flex-wrap gap-2 text-xs">
                  {out.views.detected.map((view: string) => (
                    <span
                      key={view}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium uppercase tracking-wide"
                    >
                      {view}
                    </span>
                  ))}
                  {out.views.duplicatesPruned > 0 && (
                    <span className="rounded-full border border-dashed border-slate-200 px-2 py-0.5">
                      Duplicates removed: {out.views.duplicatesPruned}
                    </span>
                  )}
                </div>
              ) : null}
              {out.findings ? (
                (() => {
                  const findings = out.findings || {};
                  const fracturePresent =
                    typeof findings.fracture_present === "boolean" ? findings.fracture_present : null;
                  const tier =
                    typeof findings.decision_tier === "string" && findings.decision_tier.trim()
                      ? findings.decision_tier.trim()
                      : fracturePresent === null
                      ? "Unknown"
                      : fracturePresent
                      ? "YES"
                      : "NO";
                  const confidenceRaw =
                    typeof findings.confidence_calibrated === "number"
                      ? Math.round(findings.confidence_calibrated * 100)
                      : typeof findings.confidence_0_1 === "number"
                      ? Math.round(findings.confidence_0_1 * 100)
                      : null;
                  const boneSegment =
                    typeof findings.bone === "string" && findings.bone.trim()
                      ? findings.bone.trim()
                      : "—";
                  const regionSegment =
                    typeof findings.region === "string" && findings.region.trim()
                      ? findings.region.trim()
                      : null;
                  const suspected =
                    typeof findings.suspected_type === "string" && findings.suspected_type.trim()
                      ? findings.suspected_type.trim()
                      : "—";
                  const angulation =
                    typeof findings.angulation_deg === "number"
                      ? formatNumber(findings.angulation_deg)
                      : null;
                  const redFlags = Array.isArray(findings.red_flags)
                    ? findings.red_flags.filter((f: unknown) => typeof f === "string" && f.trim())
                    : [];
                  const nextLine = typeof out?.nextStep === "string" ? out.nextStep : null;

                  return (
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-medium">Fracture:</span> {tier}
                        {confidenceRaw !== null && ` — Confidence: ${confidenceRaw}%`}
                      </p>
                      <p>
                        <span className="font-medium">Bone:</span> {boneSegment}
                        {regionSegment ? ` — Region: ${regionSegment}` : ""}
                      </p>
                      <p>
                        <span className="font-medium">Type:</span> {suspected}
                      </p>
                      {angulation && (
                        <p>
                          <span className="font-medium">Angle:</span> {angulation}°
                        </p>
                      )}
                      {redFlags.length > 0 && (
                        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                          <p className="font-semibold text-red-800">Red flags</p>
                          <ul className="list-disc space-y-1 pl-4">
                            {redFlags.map((flag: string) => (
                              <li key={flag}>{flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {nextLine && (
                        <p>
                          <span className="font-medium">Next:</span> {nextLine}
                        </p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm">No findings returned.</p>
              )}
              {warnings.length > 0 && (
                <div className="space-y-1 text-xs text-amber-600">
                  {warnings.map(warn => (
                    <p key={warn}>⚠️ {warn}</p>
                  ))}
                </div>
              )}
              {showUploadMore && (
                <button
                  type="button"
                  className="text-xs px-3 py-1 border border-dashed rounded disabled:opacity-60"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  Upload more views
                </button>
              )}
            </section>
          )}
          <p className="text-xs text-gray-400">{out.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

