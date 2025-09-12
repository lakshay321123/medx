import { register } from "../registry";

register({
  id: "hhs_flag",
  label: "HHS criteria met",
  inputs: [
    { key: "glucose_mgdl", required: true },
    { key: "measured_osm", required: true },
  ],
  run: ({ glucose_mgdl, measured_osm }) => {
    if (glucose_mgdl == null || measured_osm == null) return null;
    const ok = glucose_mgdl >= 600 && measured_osm >= 320;
    return { id: "hhs_flag", label: "HHS criteria met", value: ok ? "yes" : "no" };
  },
});

register({
  id: "dka_flag",
  label: "DKA criteria met",
  inputs: [
    { key: "glucose_mgdl", required: true },
    { key: "anion_gap", required: true },
    { key: "HCO3", required: true },
    { key: "pH", required: true },
  ],
  run: ({ glucose_mgdl, anion_gap, HCO3, pH }) => {
    if (glucose_mgdl == null || anion_gap == null || HCO3 == null || pH == null) return null;
    const ok = glucose_mgdl >= 250 && anion_gap >= 10 && HCO3 < 18 && pH < 7.3;
    return { id: "dka_flag", label: "DKA criteria met", value: ok ? "yes" : "no" };
  },
});

