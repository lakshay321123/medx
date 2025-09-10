@@
 register({
   id: "dengue_severity_who2009",
   label: "Dengue severity (WHO 2009)",
   inputs: [
@@
   ],
-  run: computeDengueSeverity,
+  run: (ctx: Record<string, any>) => {
+    const res = computeDengueSeverity({ ...ctx });
+    return {
+      id: "dengue_severity_who2009",
+      label: "Dengue severity (WHO 2009)",
+      ...res,
+    } as any;
+  },
 });
