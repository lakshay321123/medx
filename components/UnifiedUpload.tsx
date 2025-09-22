"use client";
import { useRef, useState } from "react";
import { safeJson } from "@/lib/safeJson";
import MessageList from "./chat/MessageList";
import type { ChatAttachment, ChatMessage } from "@/types/chat";

const MAX_VIEW_COUNT = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image

const createId = () =>
  typeof globalThis !== "undefined" &&
  typeof globalThis.crypto !== "undefined" &&
  typeof globalThis.crypto.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export default function UnifiedUpload() {
  const [loading, setLoading] = useState(false);
  const [doctorMode, setDoctorMode] = useState(true);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    const orderedFiles = pdfFiles.length ? pdfFiles : imageFiles;
    const attachments: ChatAttachment[] = await Promise.all(
      orderedFiles.map(async file => {
        const { isImage } = classify(file);
        const url = URL.createObjectURL(file);
        let width: number | undefined;
        let height: number | undefined;
        if (isImage) {
          await new Promise<void>(resolve => {
            const img = new Image();
            img.onload = () => {
              width = img.width;
              height = img.height;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          });
        }
        return {
          id: createId(),
          kind: isImage ? "image" : "file",
          name: file.name,
          mime: file.type || "application/octet-stream",
          url,
          width,
          height,
          bytes: file.size,
        } satisfies ChatAttachment;
      }),
    );

    const userMsg: ChatMessage = {
      id: createId(),
      role: "user",
      attachments,
      ts: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    setLoading(true);
    setErr(null);
    setOut(null);

    const search = new URLSearchParams(window.location.search);
    const threadId = search.get("threadId");
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
      const summary = summarizeResponse(j);
      if (summary) {
        const assistantMsg: ChatMessage = {
          id: createId(),
          role: "assistant",
          text: summary,
          content: summary,
          ts: Date.now(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("observations-updated"));
      }
    } catch (e: any) {
      const message = String(e?.message || e) || "Upload failed";
      let errMsg = "Upload clearer image or side view.";
      if (message.includes("415")) {
        errMsg = "Unsupported file type. Upload DICOM/PDF/PNG/JPG.";
      } else if (message.includes("413")) {
        errMsg = "Each image must be under 5 MB.";
      } else if (message.includes("Upload up to")) {
        errMsg = `Upload up to ${MAX_VIEW_COUNT} images (PA, lateral, oblique).`;
      }
      setErr(errMsg);
      const assistantMsg: ChatMessage = {
        id: createId(),
        role: "assistant",
        text: errMsg,
        content: errMsg,
        ts: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
      e.target.value = "";
    }

    setTimeout(() => {
      attachments.forEach(att => {
        try {
          URL.revokeObjectURL(att.url);
        } catch {}
      });
    }, 60_000);
  }

  const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return null;
    const rounded = parseFloat(value.toFixed(1));
    return Number.isNaN(rounded) ? null : rounded.toString();
  };

  const warning = typeof out?.warning === "string" && out.warning.trim() ? out.warning : null;
  const showUploadMore =
    !loading &&
    out?.type === "image" &&
    out?.findings &&
    out.findings.need_additional_views === true;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Radiograph analysis</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={doctorMode}
            onChange={e => setDoctorMode(e.target.checked)}
          />
          <span>Doctor Mode</span>
        </label>
      </div>

      <p className="text-xs text-gray-500">
        (Upload medical reports, prescriptions, discharge summaries, or hand X-rays — PDF or up to 3 image views: PA, lateral, oblique.)
      </p>

      <div className="flex flex-col overflow-hidden rounded-xl border bg-white">
        <div className="max-h-[360px] overflow-y-auto px-3 py-4">
          {messages.length ? (
            <MessageList items={messages} />
          ) : (
            <p className="text-sm text-gray-500 text-center">
              Upload medical images or reports to see them here.
            </p>
          )}
          {loading && (
            <p className="mt-3 text-center text-sm text-gray-500">Analyzing…</p>
          )}
        </div>
        <div className="border-t p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*,.dcm"
            multiple
            onChange={onChange}
            className="w-full text-sm"
          />
        </div>
      </div>

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
              {out.findings ? (
                (() => {
                  const findings = out.findings || {};
                  const fracturePresent =
                    typeof findings.fracture_present === "boolean" ? findings.fracture_present : null;
                  const confidence =
                    typeof findings.confidence_0_1 === "number"
                      ? Math.round(findings.confidence_0_1 * 100)
                      : null;
                  const fractureLabel =
                    fracturePresent === null ? "Unknown" : fracturePresent ? "YES" : "NO";
                  const confidenceLabel = confidence === null ? "" : ` (${confidence}%)`;
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
                      ? "Add lateral or oblique view to measure angulation."
                      : findings.need_additional_views === false
                      ? "No additional views requested."
                      : "Await clinician review.";

                  return (
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Fracture:</span> {fractureLabel}
                        {confidenceLabel}
                      </p>
                      <p>
                        <span className="font-medium">Bone:</span> {boneSegment}
                        {regionSegment ? ` — Region: ${regionSegment}` : ""}
                      </p>
                      <p>
                        <span className="font-medium">Type:</span> {suspected}
                      </p>
                      {metrics.length > 0 && <p>{metrics.join(" • ")}</p>}
                      <p>
                        <span className="font-medium">Next:</span> {nextLine}
                      </p>
                      {redFlags.length > 0 && (
                        <p>
                          <span className="font-medium">Red flags:</span> {redFlags.join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm">No findings returned.</p>
              )}
              {warning && <p className="text-xs text-amber-600">⚠️ {warning}</p>}
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

function summarizeResponse(data: any): string {
  if (!data) {
    return "Inconclusive — add a side (lateral) view or clearer image.";
  }
  if (data?.type === "image") {
    return summarizeFindings(data);
  }
  if (data?.type === "pdf") {
    const lines: string[] = ["Report processed."];
    const patient = typeof data.patient === "string" ? data.patient : "";
    const doctor = typeof data.doctor === "string" ? data.doctor : "";
    const patientSummary = patient
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" ");
    if (patientSummary) {
      lines.push(patientSummary);
    }
    const doctorLine = doctor
      .split("\n")
      .map(line => line.trim())
      .find(Boolean);
    if (doctorLine) {
      lines.push(`Doctor: ${doctorLine}`);
    }
    return lines.join("\n");
  }
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  return "Inconclusive — add a side (lateral) view or clearer image.";
}

function summarizeFindings(data: any): string {
  const findings = data?.findings ?? {};
  const needsViews = findings?.need_additional_views === true;
  const next = needsViews ? "\nNext: Add a side (lateral) view." : "";

  if (findings?.fracture_present === true) {
    const bone = typeof findings.bone === "string" && findings.bone.trim() ? findings.bone.trim() : "bone";
    const region = typeof findings.region === "string" && findings.region.trim() ? `, ${findings.region.trim()}` : "";
    const type =
      typeof findings.suspected_type === "string" && findings.suspected_type.trim()
        ? ` (${findings.suspected_type.trim()})`
        : "";
    const conf =
      typeof findings.confidence_0_1 === "number"
        ? ` — ${Math.round(findings.confidence_0_1 * 100)}%`
        : "";
    return `Fracture: YES${conf}\nWhere: ${bone}${region}${type}${next}`;
  }

  if (findings?.fracture_present === false) {
    const conf =
      typeof findings.confidence_0_1 === "number"
        ? ` — ${Math.round(findings.confidence_0_1 * 100)}%`
        : "";
    return `Fracture: NO${conf}${next}`;
  }

  return "Inconclusive — add a side (lateral) view or clearer image.";
}

