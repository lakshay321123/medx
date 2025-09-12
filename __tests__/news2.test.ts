import { canonicalizeInputs } from "../lib/medical/engine/extract";
import { computeAll } from "../lib/medical/engine/computeAll";

function run(input: Record<string, any>) {
  const ctx = canonicalizeInputs(input);
  return computeAll(ctx).find(r => r.id === "news2")!;
}

test("NEWS2 low risk example", () => {
  const r = run({ RR: 16, spo2_percent: 98, on_o2: false, temp_c: 37.0, SBP: 120, HR: 80, consciousness: "A" });
  expect(r.value).toBe(0);
  expect(r.notes[0]).toContain("low");
});

test("NEWS2 medium via any 3", () => {
  const r = run({ RR: 26, spo2_percent: 98, on_o2: false, temp_c: 37.0, SBP: 120, HR: 80, consciousness: "A" });
  expect(r.value).toBeGreaterThanOrEqual(3);
  expect(r.notes[0]).toContain("medium");
});

test("NEWS2 high >=7", () => {
  const r = run({ RR: 30, spo2_percent: 90, on_o2: true, temp_c: 34.9, SBP: 85, HR: 135, consciousness: "P" });
  expect(r.value).toBeGreaterThanOrEqual(7);
  expect(r.notes[0]).toContain("high");
});
