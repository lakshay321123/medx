"use client";
import TrialsFiltersBar from "./TrialsFiltersBar";
import { useResearchFilters } from "@/store/researchFilters";

export default function TrialsTable({ trials, mode, researchOn }: any) {
  const { filters } = useResearchFilters();

  if (mode !== "doctor" || !researchOn) return null;
  if (!trials || trials.length === 0) return null;

  // Apply filters
  const filtered = trials.filter((t: any) => {
    if (filters.phase && t.phase !== filters.phase) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.country && t.country !== filters.country) return false;
    if (filters.gene && !t.genes?.includes(filters.gene)) return false;
    return true;
  });

  if (filtered.length === 0) {
    return <div>No trials found. Try adjusting filters.</div>;
  }

  return (
    <div>
      <TrialsFiltersBar />
      <table className="w-full border-collapse border">
        <thead>
          <tr>
            <th className="border p-2">Trial ID</th>
            <th className="border p-2">Title</th>
            <th className="border p-2">Phase</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Country</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t: any) => (
            <tr key={t.id}>
              <td className="border p-2">{t.id}</td>
              <td className="border p-2">{t.title}</td>
              <td className="border p-2">{t.phase}</td>
              <td className="border p-2">{t.status}</td>
              <td className="border p-2">{t.country}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
