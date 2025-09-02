'use client';
import { useState } from 'react';
import Markdown from '@/components/Markdown';

export default function AnalyzePage(){
  const [doctorMode, setDoctorMode] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  async function handleFile(file: File){
    setBusy(true);
    setResult('Analyzing...');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (doctorMode) fd.append('doctorMode', 'true');
      const res = await fetch('/api/analyze', { method:'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'analysis failed');
      if (j.type === 'pdf') {
        let txt = `### Patient Summary\n${j.patient}`;
        if (j.doctor) txt += `\n\n### Doctor Summary\n${j.doctor}`;
        txt += `\n\n_${j.disclaimer}_`;
        setResult(txt);
      } else if (j.type === 'image') {
        setResult(`${j.report}\n\n_${j.disclaimer}_`);
      }
    } catch(e:any){
      setResult(`⚠️ ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding:20, maxWidth:600, margin:'0 auto' }}>
      <h1>MedX</h1>
      <label style={{ display:'block', marginTop:20 }}>
        <input type="file" accept=".pdf,image/*" disabled={busy}
          onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value=''; }} />
      </label>
      <div style={{ marginTop:8, fontSize:14, color:'#555' }}>
        Upload lab reports, prescriptions, discharge summaries, or X-rays (PDF or image).
      </div>
      <label style={{ display:'block', marginTop:12, fontSize:14 }}>
        <input type="checkbox" checked={doctorMode} onChange={e=>setDoctorMode(e.target.checked)} /> Doctor Mode
      </label>
      <div style={{ marginTop:20 }} className="markdown"><Markdown text={result} /></div>
    </div>
  );
}

