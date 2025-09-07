import { useResearchFilters } from "@/store/researchFilters";

export default function ResearchFiltersBar({ visible, onApply }: { visible: boolean; onApply: () => void; }) {
  const { filters, setFilters, reset } = useResearchFilters();
  if (!visible) return null;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      {/* Phase */}
      <select
        className="border rounded px-2 py-1"
        value={filters.phase ?? ""}
        onChange={e =>
          setFilters((f) => ({
            ...f,
            phase: (e.target.value as "" | "1" | "2" | "3" | "4") || undefined,
          }))
        }
      >
        <option value="">Any Phase</option><option value="1">Phase I</option><option value="2">Phase II</option><option value="3">Phase III</option><option value="4">Phase IV</option>
      </select>
      {/* Status */}
      <select className="border rounded px-2 py-1" value={filters.status ?? ""} onChange={e => setFilters(f => ({...f, status: (e.target.value as any) || undefined}))}>
        <option value="">Any Status</option><option value="recruiting">Recruiting</option><option value="active">Active, not recruiting</option><option value="completed">Completed</option>
      </select>
      {/* Country (simple input; you can replace with multi-select) */}
      <input className="border rounded px-2 py-1" placeholder="Country (e.g., India)" value={(filters.countries?.[0]) ?? ""} onChange={e => setFilters(f => ({...f, countries: e.target.value ? [e.target.value] : undefined}))}/>
      {/* Gene */}
      <input className="border rounded px-2 py-1" placeholder="Gene target (EGFR, ALK...)" value={(filters.genes?.[0]) ?? ""} onChange={e => setFilters(f => ({...f, genes: e.target.value ? [e.target.value] : undefined}))}/>
      <button className="border rounded px-3 py-1" onClick={onApply}>Apply</button>
      <button className="underline text-sm" onClick={reset}>Clear</button>
    </div>
  );
}
