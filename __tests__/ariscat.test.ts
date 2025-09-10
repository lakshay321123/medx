import { runARISCAT } from "@/lib/medical/engine/calculators/ariscat";

test("ARISCAT scoring bands", () => {
  const low = runARISCAT({ age: 40, spo2_room_air: 98, incision: "peripheral", duration_hours: 1 });
  expect(low.points).toBe(0);
  expect(low.risk_band).toBe("low");

  const mid = runARISCAT({ age: 65, spo2_room_air: 93, duration_hours: 2.5 });
  expect(mid.points).toBeGreaterThanOrEqual(26);
  expect(mid.risk_band).toBe("intermediate");

  const hi = runARISCAT({ age: 85, spo2_room_air: 89, incision: "intrathoracic", duration_hours: 4, emergency: true });
  expect(hi.points).toBeGreaterThanOrEqual(45);
  expect(hi.risk_band).toBe("high");
});
