"use client";
import { useState } from "react";
import { safeJson } from "@/lib/safeJson";

export default function UnifiedUpload() {
  const [loading, setLoading] = useState(false);
  const [doctorMode, setDoctorMode] = useState(true);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

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
      } else {
        setErr(message);
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="px-4 py-2 rounded bg-black text-white cursor-pointer">
          <span>Upload</span>
          <input
            type="file"
            accept="application/pdf,image/*,.dcm"
            multiple
            onChange={onChange}
            className="hidden"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={doctorMode} onChange={e=>setDoctorMode(e.target.checked)} />
          <span>Doctor Mode</span>
        </label>
      </div>

      <p className="text-xs text-gray-500">
        (Upload medical reports, prescriptions, discharge summaries, or X-rays — PDF or image. Multiple views supported.)
      </p>

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
            <section className="p-3 border rounded">
              <h3 className="font-semibold mb-1">Imaging Findings</h3>
              {out.findings ? (
                <div className="space-y-2 text-sm">
                  {(() => {
                    const findings = out.findings || {};
                    const fracturePresent =
                      typeof findings.fracture_present === "boolean"
                        ? findings.fracture_present
                        : null;
                    const confidence =
                      typeof findings.confidence_0_1 === "number"
                        ? Math.round(findings.confidence_0_1 * 100)
                        : null;
                    const fractureLabel =
                      fracturePresent === null ? "Unknown" : fracturePresent ? "Yes" : "No";
                    const confidenceLabel =
                      confidence === null ? null : `${confidence}%`;
                    const segments: string[] = [];
                    if (findings.bone) segments.push(`Bone: ${findings.bone}`);
                    if (findings.region) segments.push(`Region: ${findings.region}`);
                    const suspected = findings.suspected_type ? ` → ${findings.suspected_type}` : "";
                    const angulation =
                      typeof findings.angulation_deg === "number"
                        ? formatNumber(findings.angulation_deg)
                        : null;
                    const displacement =
                      typeof findings.displacement_mm === "number"
                        ? formatNumber(findings.displacement_mm)
                        : null;
                    const rotation =
                      typeof findings.rotation_suspected === "boolean"
                        ? findings.rotation_suspected
                        : null;
                    const metrics: string[] = [];
                    if (angulation) metrics.push(`Angulation: ${angulation}°`);
                    if (displacement) metrics.push(`Displacement: ${displacement} mm`);
                    if (rotation !== null) metrics.push(`Rotation suspected: ${rotation ? "Yes" : "No"}`);
                    const redFlags = Array.isArray(findings.red_flags)
                      ? findings.red_flags.filter((f: unknown) => typeof f === "string" && f.trim())
                      : [];
                    const nextLine =
                      findings.need_additional_views === true
                        ? "Next: Lateral/oblique views recommended."
                        : findings.need_additional_views === false
                        ? "Next: No additional views requested."
                        : "Next: Await clinician review.";

                    return (
                      <div className="space-y-1">
                        <p>
                          Fracture: {fractureLabel}
                          {confidenceLabel ? ` (${confidenceLabel})` : ""}
                        </p>
                        {(segments.length > 0 || suspected) && (
                          <p>
                            {segments.join(" — ")}
                            {suspected}
                          </p>
                        )}
                        {metrics.length > 0 && <p>{metrics.join(" • ")}</p>}
                        <p>{nextLine}</p>
                        {redFlags.length > 0 && (
                          <p>Red flags: {redFlags.join(", ")}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : out.report ? (
                <p className="whitespace-pre-wrap text-sm">{out.report}</p>
              ) : (
                <p className="text-sm">No findings returned.</p>
              )}
            </section>
          )}
          <p className="text-xs text-gray-400">{out.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

