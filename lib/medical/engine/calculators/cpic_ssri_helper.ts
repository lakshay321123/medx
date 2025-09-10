@@
 register({
   id: "cpic_ssri_helper",
   label: "CPIC SSRI helper (CYP2C19)",
   inputs: [
     { key: "cyp2c19_phenotype", required: true },
     { key: "drug", required: true },
   ],
-  run: computeCPICSSRI,
+  run: (ctx: Record<string, any>) => {
+    const res = computeCPICSSRI({
+      cyp2c19_phenotype: ctx.cyp2c19_phenotype ?? null,
+      drug: ctx.drug ?? null,
+    });
+    return {
+      id: "cpic_ssri_helper",
+      label: "CPIC SSRI helper (CYP2C19)",
+      ...res,
+    } as any;
+  },
 });
