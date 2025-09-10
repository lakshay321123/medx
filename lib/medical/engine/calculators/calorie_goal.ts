*** Begin Patch
*** Update File: lib/medical/engine/calculators/calorie_goal.ts
+import { register } from "../registry";
+
+export interface CalorieGoalInput {
+  sex: "male" | "female";
+  age: number;          // years
+  weight_kg: number;
+  height_cm: number;
+  activity_factor?: number; // 1.0–2.0 (default 1.2)
+  stress_factor?: number;   // 1.0–1.5 (default 1.0)
+}
+
+export interface CalorieGoalResult {
+  bmr_kcal_day: number;
+  tdee_kcal_day: number;
+}
+
+export function runCalorieGoal(i: CalorieGoalInput): CalorieGoalResult {
+  // Mifflin–St Jeor
+  const s = i.sex === "male" ? 5 : -161;
+  const bmr = 10 * i.weight_kg + 6.25 * i.height_cm - 5 * i.age + s;
+  const af = i.activity_factor ?? 1.2;
+  const sf = i.stress_factor ?? 1.0;
+  const tdee = bmr * af * sf;
+  return { bmr_kcal_day: Math.round(bmr), tdee_kcal_day: Math.round(tdee) };
+}
+
+register({
+  id: "calorie_goal",
+  label: "Calorie goal (MSJ × factors)",
+  inputs: [
+    { key: "sex", required: true },
+    { key: "age", required: true },
+    { key: "weight_kg", required: true },
+    { key: "height_cm", required: true },
+    { key: "activity_factor" },
+    { key: "stress_factor" },
+  ],
+  run: (ctx) => {
+    const {
+      sex,
+      age,
+      weight_kg,
+      height_cm,
+      activity_factor,
+      stress_factor,
+    } = ctx as {
+      sex?: "male" | "female";
+      age?: number;
+      weight_kg?: number;
+      height_cm?: number;
+      activity_factor?: number;
+      stress_factor?: number;
+    };
+
+    if (
+      sex == null ||
+      age == null ||
+      weight_kg == null ||
+      height_cm == null
+    )
+      return null;
+
+    const r = runCalorieGoal({
+      sex,
+      age,
+      weight_kg,
+      height_cm,
+      activity_factor,
+      stress_factor,
+    });
+
+    return {
+      id: "calorie_goal",
+      label: "Calorie goal",
+      value: r.tdee_kcal_day,
+      unit: "kcal/day",
+      notes: [`BMR ${r.bmr_kcal_day} kcal/d`],
+      precision: 0,
+    };
+  },
+});
*** End Patch
