@@
 register({
   id: "maudsley_trd",
   label: "Maudsley TRD staging (simplified)",
   inputs: [
     { key: "adequate_trials_failed", required: true },
     { key: "augmentations_attempted", required: true },
     { key: "episode_duration_months", required: true },
     { key: "severity", required: true },
   ],
-  run: computeMaudsleyTRD,
+  run: (ctx: Record<string, any>) => {
+    const res = computeMaudsleyTRD({
+      adequate_trials_failed: ctx.adequate_trials_failed ?? null,
+      augmentations_attempted: ctx.augmentations_attempted ?? null,
+      episode_duration_months: ctx.episode_duration_months ?? null,
+      severity: ctx.severity ?? null,
+    });
+    return {
+      id: "maudsley_trd",
+      label: "Maudsley TRD staging (simplified)",
+      ...res,
+    } as any;
+  },
 });
