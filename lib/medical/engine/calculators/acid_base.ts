import { register } from "../registry";
import "./acid_base_summary";

register({
  id: "winters_expected_paco2",
  label: "Expected PaCO₂ (Winter’s)",
  tags: ["acid-base"],
  inputs: [{ key: "HCO3", required: true }],
  run: ({ HCO3 }) => {
    if (HCO3 == null) return null;
    const expected = 1.5 * HCO3 + 8;
    const low = expected - 2;
    const high = expected + 2;
    const notes = [`Expected ${low.toFixed(1)}–${high.toFixed(1)} mmHg`];
    return {
      id: "winters_expected_paco2",
      label: "Expected PaCO₂ (Winter’s)",
      value: Number(expected.toFixed(1)),
      unit: "mmHg",
      precision: 1,
      notes,
    };
  },
});
