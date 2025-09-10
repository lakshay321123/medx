@@
 register({
   id: "early_allograft_dysfunction",
   label: "Early Allograft Dysfunction (liver)",
   inputs: [
     { key: "bilirubin_day7_mg_dL", required: true },
     { key: "inr_day7", required: true },
     { key: "peak_ast_first7d", required: true },
     { key: "peak_alt_first7d", required: true },
   ],
-  run: computeEAD,
+  run: (ctx: Record<string, any>) => {
+    const res = computeEAD({
+      bilirubin_day7_mg_dL: ctx.bilirubin_day7_mg_dL ?? null,
+      inr_day7: ctx.inr_day7 ?? null,
+      peak_ast_first7d: ctx.peak_ast_first7d ?? null,
+      peak_alt_first7d: ctx.peak_alt_first7d ?? null,
+    });
+    return {
+      id: "early_allograft_dysfunction",
+      label: "Early Allograft Dysfunction (liver)",
+      ...res,
+    } as any;
+  },
 });
