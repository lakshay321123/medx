"use client";
export default function MedicalProfile() {
  return (
    <div className="p-4 space-y-4">
      <section className="rounded border p-4">
        <h3 className="font-semibold mb-2">Vitals</h3>
        <div>BP: —</div><div>HR: —</div><div>BMI: —</div>
      </section>
      <section className="rounded border p-4">
        <h3 className="font-semibold mb-2">Labs</h3>
        <div>HbA1c: —</div><div>FPG: —</div><div>eGFR: —</div>
      </section>
      <section className="rounded border p-4">
        <h3 className="font-semibold mb-2">Symptoms/notes</h3>
        <div className="text-sm opacity-70">No notes yet.</div>
      </section>
    </div>
  );
}
