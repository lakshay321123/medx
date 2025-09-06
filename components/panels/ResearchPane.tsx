import TrialsPane from "@/components/panels/TrialsPane";

export default function ResearchPane() {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold mb-2">Clinical Trials</h3>
        <TrialsPane />
      </section>
    </div>
  );
}
