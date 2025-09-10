@@
 register({
   id: "furosemide_stress_test",
   label: "Furosemide Stress Test",
   inputs: [
     { key: "weight_kg", required: true },
     { key: "dose_mg", required: true },
     { key: "chronic_loop_use", required: true },
     { key: "urine_2h_mL", required: true },
   ],
-  run: computeFST,
+  run: (ctx: Record<string, any>) => {
+    const res = computeFST({
+      weight_kg: ctx.weight_kg ?? null,
+      dose_mg: ctx.dose_mg ?? null,
+      chronic_loop_use: ctx.chronic_loop_use ?? null,
+      urine_2h_mL: ctx.urine_2h_mL ?? null,
+    });
+    return {
+      id: "furosemide_stress_test",
+      label: "Furosemide Stress Test",
+      ...res,
+    } as any;
+  },
 });
