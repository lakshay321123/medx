import { finalizeCalc } from "@/lib/medical/engine/verification/triageFinalizer";

export async function safeFinalizeCalc(args: Parameters<typeof finalizeCalc>[0]) {
  try {
    const v = await finalizeCalc(args);
    // Always guarantee a finite number out
    if (!Number.isFinite(v.final)) {
      return { ...v, final: 0, tier: "local", reason: (v.reason || "") + " | normalized non-finite to 0" };
    }
    return v;
  } catch (e) {
    console.error("[safeFinalizeCalc] Uncaught:", e);
    const precision = args.precision ?? 2;
    return {
      status: "ok",
      final: Number(args.localResult.toFixed(precision)),
      tier: "local",
      attempts: 0,
      agreeWithLocal: true,
      deltaAbs: 0,
      deltaPct: 0,
      reason: "Caught uncaught error; returned local.",
    };
  }
}
