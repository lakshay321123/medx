@@
 register({
   id: "malaria_severity_who",
   label: "Malaria severity (WHO)",
   inputs: [
@@
   ],
-  run: computeMalariaSeverity,
+  run: (ctx: Record<string, any>) => {
+    const res = computeMalariaSeverity({ ...ctx });
+    return {
+      id: "malaria_severity_who",
+      label: "Malaria severity (WHO)",
+      ...res,
+    } as any;
+  },
 });
