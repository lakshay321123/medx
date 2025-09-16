// app/timeline/page.tsx
import TimelinePanel from "@/components/timeline/TimelinePanel";

export default function TimelinePage() {
  // If you already know patientId from profile state, you can pass it:
  // const patientId = ...
  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold">Timeline</h1>
      <TimelinePanel />
    </div>
  );
}
