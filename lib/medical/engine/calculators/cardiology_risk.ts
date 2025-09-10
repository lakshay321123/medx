import { register } from "../registry";
import { chadsVascNotes } from "../interpret";

register({
  id: "cha2ds2_vasc",
  label: "CHA₂DS₂-VASc",
  inputs: [
    { key: "age", required: true },
    { key: "sex", required: true },
    { key: "hx_chf" },
    { key: "hx_htn" },
    { key: "hx_dm" },
    { key: "hx_stroke_tia" },
    { key: "hx_vascular" },
  ],
  run: (ctx: any) => {
    const { age, sex } = ctx;
    if (age == null || !sex) return null;
    let s = 0;
    if (ctx.hx_chf) s++;
    if (ctx.hx_htn) s++;
    if (age >= 75) s += 2;
    else if (age >= 65) s++;
    if (ctx.hx_dm) s++;
    if (ctx.hx_stroke_tia) s += 2;
    if (ctx.hx_vascular) s++;
    if (sex === "female") s++;
    return { id: "cha2ds2_vasc", label: "CHA₂DS₂-VASc", value: s, notes: chadsVascNotes(s) };
  },
});

register({
  id: "chadsvasc_detected",
  label: "CHA₂DS₂-VASc (inputs needed)",
  inputs: [],
  run: () => ({
    id: "chadsvasc_detected",
    label: "CHA₂DS₂-VASc (inputs needed)",
    value: 0,
    precision: 0,
    notes: ["Ask: age, sex, CHF, HTN, DM, stroke/TIA, vascular disease"],
  }),
});

register({
  id: "has_bled",
  label: "HAS-BLED",
  inputs: [
    { key: "age", required: true },
    { key: "hx_htn" },
    { key: "renal_impair" },
    { key: "liver_impair" },
    { key: "hx_stroke_tia" },
    { key: "hx_bleed" },
    { key: "nsaid" },
    { key: "alcohol" },
  ],
  run: (ctx: any) => {
    const { age } = ctx;
    if (age == null) return null;
    let s = 0;
    if (ctx.hx_htn) s++;
    if (ctx.renal_impair) s++;
    if (ctx.liver_impair) s++;
    if (ctx.hx_stroke_tia) s++;
    if (ctx.hx_bleed) s++;
    if (age > 65) s++;
    if (ctx.nsaid) s++;
    if (ctx.alcohol) s++;
    return { id: "has_bled", label: "HAS-BLED", value: s };
  },
});

register({
  id: "hasbled_detected",
  label: "HAS-BLED (inputs needed)",
  inputs: [],
  run: () => ({
    id: "hasbled_detected",
    label: "HAS-BLED (inputs needed)",
    value: 0,
    precision: 0,
    notes: ["Ask: HTN, renal/liver fx, stroke, bleeding, INR lability, age, drugs/alcohol"],
  }),
});
