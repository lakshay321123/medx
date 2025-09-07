import { useResearchFilters } from "@/store/researchFilters";

export default function ResearchFiltersBar({
  visible,
  onApply,
}: {
  visible: boolean;
  onApply: () => void;
}) {
  const { filters, setFilters, reset } = useResearchFilters();
  if (!visible) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2 items-center">
      <select
        className="border rounded px-2 py-1"
        value={filters.phase ?? ""}
        onChange={(e) => setFilters(f => ({ ...f, phase: (e.target.value || undefined) as any }))}
      >
        <option value="">Any Phase</option>
        <option value="1">Phase I</option>
        <option value="2">Phase II</option>
        <option value="3">Phase III</option>
        <option value="4">Phase IV</option>
      </select>

      <select
        className="border rounded px-2 py-1"
        value={filters.status ?? ""}
        onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as any }))}
      >
        <option value="">Any Status</option>
        <option value="recruiting">Recruiting</option>
        <option value="active">Active, not recruiting</option>
        <option value="completed">Completed</option>
      </select>

      <input
        className="border rounded px-2 py-1"
        placeholder="Country (e.g., India)"
        value={filters.countries?.[0] ?? ""}
        onChange={(e) => setFilters(f => ({ ...f, countries: e.target.value ? [e.target.value] : undefined }))}
      />

      <input
        className="border rounded px-2 py-1"
        placeholder="Gene (EGFR, ALK...)"
        value={filters.genes?.[0] ?? ""}
        onChange={(e) => setFilters(f => ({ ...f, genes: e.target.value ? [e.target.value] : undefined }))}
      />

      <button className="border rounded px-3 py-1" onClick={onApply}>Apply</button>
      <button className="underline text-sm" onClick={reset}>Clear</button>
    </div>
  );
}
