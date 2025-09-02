"use client";
import { useState } from "react";

export default function UnifiedUpload() {
  const [loading, setLoading] = useState(false);
  const [doctorMode, setDoctorMode] = useState(true);
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name?.toLowerCase() || "";
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    const isImage =
      file.type.startsWith("image/") ||
      /\.(png|jpe?g|webp|bmp|gif|tif?f)$/i.test(name);
    if (!isPdf && !isImage) {
      setErr(`Unsupported file type: ${file.type || name}. Upload a PDF or an image.`);
      return;
    }

    setLoading(true);
    setErr(null);
    setOut(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("doctorMode", String(doctorMode));

    const r = await fetch("/api/analyze", { method: "POST", body: fd });
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
          <input type="file" accept="application/pdf,image/*" onChange={onChange} className="hidden" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={doctorMode} onChange={e=>setDoctorMode(e.target.checked)} />
          <span>Doctor Mode</span>
        </label>
      </div>

      <p className="text-xs text-gray-500">
        (Upload medical reports, prescriptions, discharge summaries, or X-rays — PDF or image.)
      </p>

      {loading && <p>Analyzing…</p>}
      {err && <p className="text-red-600">⚠️ {err}</p>}

      {out && (
        <div className="space-y-3">
          {out.type === "pdf" && (
            <>
              <section className="p-3 border rounded">
                <h3 className="font-semibold mb-1">Patient Summary</h3>
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

