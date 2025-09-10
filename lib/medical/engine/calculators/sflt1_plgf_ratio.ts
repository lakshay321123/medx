@@
 register({
   id: "sflt1_plgf_ratio",
   label: "sFlt-1/PlGF ratio",
   inputs: [
     { key: "sflt1_pg_mL", required: true },
     { key: "plgf_pg_mL", required: true },
     { key: "ga_weeks", required: true },
   ],
-  run: computeSfltPlgf,
+  run: (ctx: Record<string, any>) => {
+    const res = computeSfltPlgf({
+      sflt1_pg_mL: ctx.sflt1_pg_mL ?? null,
+      plgf_pg_mL: ctx.plgf_pg_mL ?? null,
+      ga_weeks: ctx.ga_weeks ?? null,
+    });
+    return {
+      id: "sflt1_plgf_ratio",
+      label: "sFlt-1/PlGF ratio",
+      ...res,
+    } as any;
+  },
 });
