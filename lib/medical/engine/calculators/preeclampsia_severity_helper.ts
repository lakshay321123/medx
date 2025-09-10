@@
 register({
   id: "preeclampsia_severity_helper",
   label: "Preeclampsia severity (ISSHP/ACOG helper)",
   inputs: [
@@
   ],
-  run: computePreeclampsiaSeverity,
+  run: (ctx: Record<string, any>) => {
+    const res = computePreeclampsiaSeverity({
+      ga_weeks: ctx.ga_weeks ?? null,
+      sbp_mmHg: ctx.sbp_mmHg ?? null,
+      dbp_mmHg: ctx.dbp_mmHg ?? null,
+      platelets_x10e9_L: ctx.platelets_x10e9_L ?? null,
+      ast_u_L: ctx.ast_u_L ?? null,
+      alt_u_L: ctx.alt_u_L ?? null,
+      creatinine_mg_dL: ctx.creatinine_mg_dL ?? null,
+      neuro_symptoms: ctx.neuro_symptoms ?? null,
+      pulmonary_edema: ctx.pulmonary_edema ?? null,
+      severe_bp_persistent: ctx.severe_bp_persistent ?? null,
+      proteinuria_present: ctx.proteinuria_present ?? null,
+    });
+    return {
+      id: "preeclampsia_severity_helper",
+      label: "Preeclampsia severity (ISSHP/ACOG helper)",
+      ...res,
+    } as any;
+  },
 });
