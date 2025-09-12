import { canonicalizeInputs } from "../lib/medical/engine/extract";
import { computeAll } from "../lib/medical/engine/computeAll";

function run(input: Record<string, any>) {
  const ctx = canonicalizeInputs(input);
  return computeAll(ctx).find(r => r.id === "news2")!;
}

test("NEWS2 zero risk example", () => {
  const r = run({ RR: 16, spo2_percent: 98, on_o2: false, temp_c: 37.0, SBP: 120, HR: 80, consciousness: "A" });
  expect(r.value).toBe(0);
  expect(r.notes[0]).toContain("zero");
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

test("NEWS2 accepts oxygen aliases", () => {
  const r = run({ RR: 16, spo2_percent: 98, o2_lpm: 2, temp_c: 37.0, SBP: 120, HR: 80, consciousness: "A" });
  expect(r.value).toBe(2);
  expect(r.notes[0]).toContain("low");
  expect(r.notes[0]).toContain("on O₂");
});

test("NEWS2 requires complete inputs", () => {
  const ctx = canonicalizeInputs({ RR: 16, spo2_percent: 98, temp_c: 37.0, SBP: 120, HR: 80 });
  const r = computeAll(ctx).find(out => out.id === "news2");
  expect(r).toBeUndefined();
});
