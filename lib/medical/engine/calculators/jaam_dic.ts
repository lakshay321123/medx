@@
 register({
   id: "jaam_dic",
   label: "JAAM DIC score (simplified)",
   inputs: [
     { key: "sirs_count", required: true },
     { key: "platelets_x10e9_L", required: true },
     { key: "pt_inr", required: true },
     { key: "d_dimer_mult_uln", required: true },
   ],
-  run: computeJAAMDIC,
+  run: (ctx: Record<string, any>) => {
+    const res = computeJAAMDIC({
+      sirs_count: ctx.sirs_count ?? null,
+      platelets_x10e9_L: ctx.platelets_x10e9_L ?? null,
+      pt_inr: ctx.pt_inr ?? null,
+      d_dimer_mult_uln: ctx.d_dimer_mult_uln ?? null,
+    });
+    return {
+      id: "jaam_dic",
+      label: "JAAM DIC score (simplified)",
+      ...res,
+    } as any;
+  },
 });
