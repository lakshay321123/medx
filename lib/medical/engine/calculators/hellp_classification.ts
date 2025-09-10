@@
 register({
   id: "hellp_classification",
   label: "HELLP classification (simplified)",
   inputs: [
     { key: "platelets_x10e9_L", required: true },
     { key: "ast_u_L", required: true },
     { key: "alt_u_L", required: true },
     { key: "ldh_u_L", required: true },
     { key: "bilirubin_mg_dL", required: true },
   ],
-  run: computeHELLP,
+  run: (ctx: Record<string, any>) => {
+    const res = computeHELLP({
+      platelets_x10e9_L: ctx.platelets_x10e9_L ?? null,
+      ast_u_L: ctx.ast_u_L ?? null,
+      alt_u_L: ctx.alt_u_L ?? null,
+      ldh_u_L: ctx.ldh_u_L ?? null,
+      bilirubin_mg_dL: ctx.bilirubin_mg_dL ?? null,
+    });
+    return {
+      id: "hellp_classification",
+      label: "HELLP classification (simplified)",
+      ...res,
+    } as any;
+  },
 });
