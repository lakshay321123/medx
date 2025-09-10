@@
 register({
   id: "sepsis3_gate",
   label: "Sepsis-3 gate",
   inputs: [
     { key: "suspected_infection", required: true },
     { key: "sofa_baseline", required: true },
     { key: "sofa_current", required: true },
     { key: "map_mmHg", required: true },
     { key: "lactate_mmol_L", required: true },
     { key: "vasopressors", required: true },
   ],
-  run: computeSepsis3Gate,
+  run: (ctx: Record<string, any>) => {
+    const res = computeSepsis3Gate({
+      suspected_infection: ctx.suspected_infection ?? null,
+      sofa_baseline: ctx.sofa_baseline ?? null,
+      sofa_current: ctx.sofa_current ?? null,
+      map_mmHg: ctx.map_mmHg ?? null,
+      lactate_mmol_L: ctx.lactate_mmol_L ?? null,
+      vasopressors: ctx.vasopressors ?? null,
+    });
+    return {
+      id: "sepsis3_gate",
+      label: "Sepsis-3 gate",
+      ...res,
+    } as any;
+  },
 });
