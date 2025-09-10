diff --git a/lib/medical/engine/calculators/astct_crs_icans.ts b/lib/medical/engine/calculators/astct_crs_icans.ts
index 0000000..0000001 100644
--- a/lib/medical/engine/calculators/astct_crs_icans.ts
+++ b/lib/medical/engine/calculators/astct_crs_icans.ts
@@ -1,4 +1,4 @@
-import { register } from "../registry";
+import { register } from "../registry";
 
 /**
  * ASTCT CRS v2 (simplified):
@@ -35,7 +35,7 @@ export function gradeCRS(params: {
   return { grade, notes: [] };
 }
 
-/**
+/**
  * ASTCT ICANS (adult ICE-based):
  * Grade by ICE score + modifiers
  * - G1: ICE 7–9
@@ -64,23 +64,57 @@ export function gradeICANS(params: {
   return { grade, notes: [] };
 }
 
-register({
-  id: "astct_crs",
-  label: "ASTCT CRS grading",
-  inputs: [
-    { key: "temp_C", required: true },
-    { key: "vasopressor_support", required: true },
-    { key: "hypoxia_support", required: true },
-  ],
-  run: gradeCRS,
-});
+// Wrap the pure function so it returns a CalcResult (must include id & label)
+register({
+  id: "astct_crs",
+  label: "ASTCT CRS grading",
+  inputs: [
+    { key: "temp_C", required: true },
+    { key: "vasopressor_support", required: true },
+    { key: "hypoxia_support", required: true },
+  ],
+  run: (ctx: Record<string, any>) => {
+    const res = gradeCRS({
+      temp_C: ctx.temp_C ?? null,
+      vasopressor_support: ctx.vasopressor_support ?? "none",
+      hypoxia_support: ctx.hypoxia_support ?? "none",
+    });
+    // Return CalcResult shape (at minimum id & label)
+    return {
+      id: "astct_crs",
+      label: "ASTCT CRS grading",
+      ...res, // exposes { grade, notes }
+    } as any; // cast to satisfy CalcResult typing in your engine
+  },
+});
 
-register({
-  id: "astct_icans",
-  label: "ASTCT ICANS grading",
-  inputs: [
-    { key: "ice_score_0_10", required: true },
-    { key: "seizure" },
-    { key: "motor_weakness" },
-    { key: "cerebral_edema" },
-  ],
-  run: gradeICANS,
-});
+register({
+  id: "astct_icans",
+  label: "ASTCT ICANS grading",
+  inputs: [
+    { key: "ice_score_0_10", required: true },
+    { key: "seizure" },
+    { key: "motor_weakness" },
+    { key: "cerebral_edema" },
+  ],
+  run: (ctx: Record<string, any>) => {
+    const res = gradeICANS({
+      ice_score_0_10: ctx.ice_score_0_10 ?? null,
+      seizure: ctx.seizure ?? false,
+      motor_weakness: ctx.motor_weakness ?? false,
+      cerebral_edema: ctx.cerebral_edema ?? false,
+    });
+    return {
+      id: "astct_icans",
+      label: "ASTCT ICANS grading",
+      ...res, // { grade, notes }
+    } as any;
+  },
+});
