import { register } from "../registry";

register({
  id: "meld_na",
  label: "MELD-Na",
  inputs: [
    { key: "bilirubin", required: true },
    { key: "INR", required: true },
    { key: "creatinine", required: true },
    { key: "Na", required: true },
  ],
  run: ({ bilirubin, INR, creatinine, Na }) => {
    if (bilirubin == null || INR == null || creatinine == null || Na == null) return null;
    const meld =
      3.78 * Math.log(Math.max(bilirubin, 1)) +
      11.2 * Math.log(Math.max(INR, 1)) +
      9.57 * Math.log(Math.max(creatinine, 1)) +
      6.43;
    const meldNa = meld + 1.32 * (137 - Na) - 0.033 * meld * (137 - Na);
    return { id: "meld_na", label: "MELD-Na", value: meldNa, precision: 0 };
  },
});

register({
  id: "child_pugh",
  label: "Child-Pugh",
  inputs: [
    { key: "bilirubin", required: true },
    { key: "albumin", required: true },
    { key: "INR", required: true },
    { key: "ascites" },
    { key: "encephalopathy" },
  ],
  run: ({ bilirubin, albumin, INR, ascites, encephalopathy }) => {
    if (bilirubin == null || albumin == null || INR == null) return null;
    const score = (bilirubin > 3 ? 3 : bilirubin > 2 ? 2 : 1) +
      (albumin < 2.8 ? 3 : albumin < 3.5 ? 2 : 1) +
      (INR > 2.3 ? 3 : INR > 1.7 ? 2 : 1) +
      (ascites === "moderate" ? 3 : ascites === "mild" ? 2 : ascites ? 1 : 1) +
      (encephalopathy === "moderate" ? 3 : encephalopathy === "mild" ? 2 : encephalopathy ? 1 : 1);
    const cls = score >= 10 ? "C" : score >= 7 ? "B" : "A";
    return { id: "child_pugh", label: "Child-Pugh", value: score, notes: [`Class ${cls}`] };
  },
});
