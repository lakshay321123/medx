@@
 register({
   id: "sledai2k",
   label: "SLEDAI-2K",
   inputs: [
@@
   ],
-  run: computeSLEDAI,
+  run: (ctx: Record<string, any>) => {
+    const res = computeSLEDAI({
+      seizures: !!ctx.seizures,
+      psychosis: !!ctx.psychosis,
+      organic_brain: !!ctx.organic_brain,
+      visual_disturb: !!ctx.visual_disturb,
+      cranial_nerve: !!ctx.cranial_nerve,
+      lupus_headache: !!ctx.lupus_headache,
+      cva: !!ctx.cva,
+      vasculitis: !!ctx.vasculitis,
+      arthritis: !!ctx.arthritis,
+      myositis: !!ctx.myositis,
+      urinary_casts: !!ctx.urinary_casts,
+      hematuria: !!ctx.hematuria,
+      proteinuria_g_day: ctx.proteinuria_g_day ?? null,
+      pyuria: !!ctx.pyuria,
+      rash: !!ctx.rash,
+      alopecia: !!ctx.alopecia,
+      mucosal_ulcers: !!ctx.mucosal_ulcers,
+      pleurisy: !!ctx.pleurisy,
+      pericarditis: !!ctx.pericarditis,
+      low_complement: !!ctx.low_complement,
+      increased_anti_dsDNA: !!ctx.increased_anti_dsDNA,
+      fever: !!ctx.fever,
+      thrombocytopenia: !!ctx.thrombocytopenia,
+      leukopenia: !!ctx.leukopenia,
+    });
+    return {
+      id: "sledai2k",
+      label: "SLEDAI-2K",
+      ...res,
+    } as any;
+  },
 });
