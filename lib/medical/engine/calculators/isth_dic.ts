@@
 register({
   id: "isth_dic",
   label: "ISTH DIC score",
   inputs: [
     { key: "platelets_x10e9_L", required: true },
     { key: "pt_seconds_over_control", required: true },
     { key: "d_dimer_value", required: true },
     { key: "d_dimer_uln", required: true },
     { key: "fibrinogen_g_L", required: true },
   ],
-  run: computeISTHDIC,
+  run: (ctx: Record<string, any>) => {
+    const res = computeISTHDIC({
+      platelets_x10e9_L: ctx.platelets_x10e9_L ?? null,
+      pt_seconds_over_control: ctx.pt_seconds_over_control ?? null,
+      d_dimer_value: ctx.d_dimer_value ?? null,
+      d_dimer_uln: ctx.d_dimer_uln ?? null,
+      fibrinogen_g_L: ctx.fibrinogen_g_L ?? null,
+    });
+    return {
+      id: "isth_dic",
+      label: "ISTH DIC score",
+      ...res,
+    } as any;
+  },
 });
