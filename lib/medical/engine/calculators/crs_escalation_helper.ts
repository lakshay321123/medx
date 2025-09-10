@@
 register({
   id: "crs_escalation_helper",
   label: "CRS escalation helper",
   inputs: [
     { key: "crs_grade", required: true },
     { key: "oxygen_support", required: true },
     { key: "vasopressor_support", required: true },
   ],
-  run: computeCRSEscalation,
+  run: (ctx: Record<string, any>) => {
+    const res = computeCRSEscalation({
+      crs_grade: ctx.crs_grade,
+      oxygen_support: ctx.oxygen_support,
+      vasopressor_support: ctx.vasopressor_support,
+    });
+    return {
+      id: "crs_escalation_helper",
+      label: "CRS escalation helper",
+      ...res,
+    } as any;
+  },
 });
