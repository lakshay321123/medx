'use client';
import { FileText, Stethoscope } from 'lucide-react';

export default function ToolsTray({ onOpen }: { onOpen: (tool:'prescription'|'mapper')=>void }) {
  return (
    <div className="toolTray">
      <button className="chip" onClick={()=>onOpen('prescription')}><FileText size={14}/> Prescription Checker</button>
      <button className="chip" onClick={()=>onOpen('mapper')}><Stethoscope size={14}/> Concept Mapper</button>
    </div>
  );
}
