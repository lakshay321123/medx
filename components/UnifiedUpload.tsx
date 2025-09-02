"use client";
import { useState } from "react";

export default function UnifiedUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState("");
  const [audience, setAudience] = useState<"patient"|"clinician">("patient");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] || null);
    setOut(null);
    setErr(null);
  }

  async function onAnalyze() {
    try {
      if (!file) return setErr("Please choose a file first.");
      setLoading(true); setErr(null); setOut(null);

      const name = (file.name || "").toLowerCase();
      const mime = file.type || ""; // sometimes blank
      const isPdf   = mime === "application/pdf" || name.endsWith(".pdf");
      const isImage = mime.startsWith("image/") ||
                      /\.(png|jpe?g|gif|bmp|webp)$/i.test(name);

      const endpoint = isPdf ? "/api/analyze" : isImage ? "/api/imaging/analyze" : null;
      if (!endpoint) throw new Error("Unsupported file type. Please upload a PDF or an image.");

      const fd = new FormData();
      fd.append("file", file);
      fd.append("instruction", instruction);
      fd.append("audience", audience);

      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analyze failed");
      setOut(data);
    } catch (e:any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input type="file" accept=".pdf,image/*" onChange={onFileChange} />

      <label className="block text-sm font-medium">Command (optional)</label>
      <textarea
        rows={3}
        placeholder='e.g., "Explain in simple language" or "Clinician note with differentials and next steps"'
        value={instruction}
        onChange={(e)=>setInstruction(e.target.value)}
        className="w-full p-2 border rounded"
      />

      <div className="flex items-center gap-3">
        <label className="text-sm">Audience:</label>
        <select
          value={audience}
          onChange={(e)=>setAudience(e.target.value as any)}
          className="p-1 border rounded"
        >
          <option value="patient">Patient-friendly</option>
          <option value="clinician">Clinician detail</option>
        </select>

        <button disabled={loading || !file} onClick={onAnalyze} className="px-3 py-1 border rounded">
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {err && <p className="text-red-600 text-sm">⚠️ {err}</p>}

      {out && (
        <div className="p-3 border rounded space-y-2">
          <div className="text-sm text-gray-500">Filename: {out.filename}</div>
          {out.type === "pdf" && (
            <section>
              <h3 className="font-semibold mb-1">Document Analysis</h3>
              <p className="whitespace-pre-wrap text-sm">{out.report}</p>
            </section>
          )}
          {out.type === "image" && (
            <section>
              <h3 className="font-semibold mb-1">Imaging Report</h3>
              <p className="whitespace-pre-wrap text-sm">{out.report}</p>
            </section>
          )}
          <p className="text-xs text-gray-400">{out.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

