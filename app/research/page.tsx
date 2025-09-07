"use client";
import { fetchTrials } from "@/lib/research/searchTrials";
import { useTrialsSearchStore } from "@/lib/research/useTrialsSearchStore";
import TopBar from "@/components/research/TopBar";
import FiltersBar from "@/components/research/FiltersBar";

export default function ResearchPage() {
  const { set } = useTrialsSearchStore();
  const onSearch = async () => {
    await fetchTrials();
  };

  return (
    <>
      <TopBar />
      <div className="px-4">
        <FiltersBar onSearch={onSearch} />
        {/* trials table */}
      </div>
    </>
  );
}
