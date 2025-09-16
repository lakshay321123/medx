import TimelinePanel from "@/components/timeline/TimelinePanel";

export default function Timeline({ patientId }: { patientId?: string }) {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Timeline</h2>
      <TimelinePanel patientId={patientId} />
    </div>
  );
}
