"use client";

import { useResearchFilters } from "@/store/researchFilters";
import type { Phase, Status } from "@/types/research-core";

export type Trial = {
  id: string;
  title: string;
  phase?: Phase;
  status?: Status;
  country?: string;
  gene?: string;
  url: string;
};

export default function TrialsTable({ trials }: { trials: Trial[] }) {
  const { filters } = useResearchFilters();
  if (!trials || trials.length === 0) return null;

  const filtered = trials.filter((t) => {
    if (filters.phase && t.phase !== filters.phase) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.country && t.country !== filters.country) return false;
    if (filters.gene && t.gene !== filters.gene) return false;
    return true;
  });

  if (!filtered.length) return <p>No matching trials found.</p>;

  return (
    <table className="w-full border-collapse border border-gray-300 text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="border px-2 py-1">ID</th>
          <th className="border px-2 py-1">Title</th>
          <th className="border px-2 py-1">Phase</th>
          <th className="border px-2 py-1">Status</th>
          <th className="border px-2 py-1">Country</th>
          <th className="border px-2 py-1">Gene</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((t) => (
          <tr key={t.id}>
            <td className="border px-2 py-1">{t.id}</td>
            <td className="border px-2 py-1">
              <a className="text-blue-600 underline" href={t.url} target="_blank" rel="noopener noreferrer">
                {t.title}
              </a>
            </td>
            <td className="border px-2 py-1">{t.phase}</td>
            <td className="border px-2 py-1">{t.status}</td>
            <td className="border px-2 py-1">{t.country}</td>
            <td className="border px-2 py-1">{t.gene}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
