import { register } from "../registry";

register({
  id: "sirs",
  label: "SIRS",
  tags: ["sepsis"],
  // No hard-required inputs: we’ll evaluate each criterion only if its data is present.
  inputs: [
    { key: "temp_c" },
    { key: "HR" },
    { key: "RR" },
    { key: "pCO2" },          // restore PaCO₂ branch
    { key: "WBC" },
    { key: "bands_percent" }, // restore bandemia branch
  ],
  run: ({ temp_c, HR, RR, pCO2, WBC, bands_percent }) => {
    let score = 0;
    let evaluated = 0;

    // Temperature >38 or <36
    if (temp_c != null) {
      evaluated++;
      if (temp_c > 38 || temp_c < 36) score++;
    }

    // Heart rate >90
    if (HR != null) {
      evaluated++;
      if (HR > 90) score++;
    }

    // Respiratory: RR >20 OR PaCO2 <32 mmHg
    if (RR != null || pCO2 != null) {
      evaluated++;
      const rrCrit = RR != null && RR > 20;
      const pco2Crit = pCO2 != null && pCO2 < 32;
      if (rrCrit || pco2Crit) score++;
    }

    // WBC >12 or <4 OR bands >10%
    if (WBC != null || bands_percent != null) {
      evaluated++;
      const wbcCrit = WBC != null && (WBC > 12 || WBC < 4);
      const bandsCrit = bands_percent != null && bands_percent > 10;
      if (wbcCrit || bandsCrit) score++;
    }

    const notes: string[] = [
      `criteria met: ${score}`,
      `criteria evaluated: ${evaluated}/4`,
    ];
    if (evaluated < 4) notes.push("incomplete inputs");
    notes.push(score >= 2 ? "SIRS positive" : "SIRS negative (<2)");

    return { id: "sirs", label: "SIRS", value: score, precision: 0, notes };
  },
});

