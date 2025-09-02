"use client";
import { useState } from "react";

export default function UnifiedUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState("");
  const [audience, setAudience] = useState<"patient" | "clinician">("patient");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setErr(null);
    setOut(null);
  }

  async function onAnalyze() {
    if (!file) {
      setErr("Please upload a file.");
      return;
    }

    const name = (file.name || "").toLowerCase();
    const mime = file.type || "";
    const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
    const isImage = mime.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp)$/i.test(name);
    const endpoint = isPdf ? "/api/analyze" : isImage ? "/api/imaging/analyze" : null;
    if (!endpoint) {
      setErr(`Unsupported file type: ${file.type || name}. Upload a PDF or an image.`);
      return;
    }

    setLoading(true);
    setErr(null);
    setOut(null);

    const fd = new FormData();
    fd.append("file", file);
    if (instruction) fd.append("instruction", instruction);
    fd.append("audience", audience);

    const r = await fetch(endpoint, { method: "POST", body: fd });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) return setErr(j.error || "Upload failed");
    setOut(j);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="px-4 py-2 rounded bg-black text-white cursor-pointer">
          <span>Upload</span>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={onFileChange}
            className="hidden"
          />
        </label>
        {file && <span className="text-sm">{file.name}</span>}
      </div>

      <textarea
        className="w-full p-2 border rounded text-sm"
        placeholder="Optional instruction"
        value={instruction}
        onChange={e => setInstruction(e.target.value)}
      />

      <div className="flex items-center gap-2 text-sm">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="audience"
            value="patient"
            checked={audience === "patient"}
            onChange={() => setAudience("patient")}
          />
          <span>Patient</span>
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="audience"
            value="clinician"
            checked={audience === "clinician"}
            onChange={() => setAudience("clinician")}
          />
          <span>Clinician</span>
        </label>
        <button
          onClick={onAnalyze}
          className="ml-auto px-4 py-2 rounded bg-blue-600 text-white"
          disabled={loading}
        >
          Analyze
        </button>
      </div>

      <p className="text-xs text-gray-500">
        (Upload medical reports, prescriptions, discharge summaries, or X-rays — PDF or image.)
      </p>

      {loading && <p>Analyzing…</p>}
      {err && <p className="text-red-600">⚠️ {err}</p>}

      {out && (
        <div className="space-y-3">
          <section className="p-3 border rounded">
            <h3 className="font-semibold mb-1">
              {out.type === "image" ? "Imaging Report" : "PDF Report"}
            </h3>
            <p className="whitespace-pre-wrap text-sm">{out.report}</p>
          </section>
          <p className="text-xs text-gray-400">{out.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

