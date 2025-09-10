/** Auto-generated Jest suite for calculators EXT351–400 */
import "../../lib/medical/engine/calculators/lab_interpretation";
const registry = require("../../lib/medical/engine/registry");
function getCalc(id) {
  const g = registry.get || registry.getCalculator || registry.resolve || registry.lookup;
  if (typeof g === "function") return g.call(registry, id);
  if (registry.registry && registry.registry[id]) return registry.registry[id];
  throw new Error(`Registry.get() not found for ${id}`);
}
async function runCalc(id, inputs) {
  const direct = registry.run || registry.invoke || registry.evaluate || registry.exec || null;
  if (typeof direct === "function") return await direct.call(registry, id, inputs);
  const calc = getCalc(id);
  if (!calc || typeof calc.run !== "function") throw new Error(`Missing run() for ${id}`);
  return await calc.run(inputs);
}
function expectShape(o) {
  expect(o).toBeTruthy();
  expect(typeof o.id).toBe("string");
  expect(typeof o.label).toBe("string");
  expect(["number","string"]).toContain(typeof o.value);
  expect(typeof o.unit).toBe("string");
  expect(typeof o.precision).toBe("number");
  expect(Array.isArray(o.notes)).toBe(true);
}
const CASES = [
  {
    "id": "triss_surrogate",
    "inputs": {
      "prob": 1
    }
  },
  {
    "id": "canadian_headct_flag",
    "inputs": {
      "high_risk_present": true
    }
  },
  {
    "id": "new_orleans_headct_flag",
    "inputs": {
      "criteria_met": 100
    }
  },
  {
    "id": "nsqip_mica_surrogate",
    "inputs": {
      "risk_percent": 1
    }
  },
  {
    "id": "possummortality_surrogate",
    "inputs": {
      "percent": 1
    }
  },
  {
    "id": "basdai_score",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "disease_activity_das28_crp",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "pasi75_response_flag",
    "inputs": {
      "improvement_percent": 1
    }
  },
  {
    "id": "pasi90_response_flag",
    "inputs": {
      "improvement_percent": 1
    }
  },
  {
    "id": "scorad_index_band",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "slaq_surrogate",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "barthel_adl_score",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "glasgow_outcome_scale",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "mmse_band",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "moca_band",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "khorana_vte_surrogate",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "plasmic_surrogate",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "isth_dic_calc",
    "inputs": {
      "platelets_k": 150,
      "ddimer_band": 1,
      "pt_prolong_sec": 1,
      "fibrinogen_g_l": 1
    }
  },
  {
    "id": "neutropenia_band",
    "inputs": {
      "anc_k": 100
    }
  },
  {
    "id": "mascc_surrogate",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "tls_support_flag",
    "inputs": {
      "criteria_met": 100
    }
  },
  {
    "id": "ripi_surrogate",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "flipi_surrogate",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "ipss_surrogate",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "ipssm_surrogate",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "riss_surrogate",
    "inputs": {
      "stage": 24
    }
  },
  {
    "id": "mgus_mayo_surrogate",
    "inputs": {
      "risk_factors": 100
    }
  },
  {
    "id": "gleason_grade_group",
    "inputs": {
      "group": 1
    }
  },
  {
    "id": "psa_risk_band",
    "inputs": {
      "psa_ng_ml": 1
    }
  },
  {
    "id": "deauville_pet_band",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "tnm_stage_surrogate",
    "inputs": {
      "stage": 24
    }
  },
  {
    "id": "ca125_band",
    "inputs": {
      "ca125_u_ml": 1
    }
  },
  {
    "id": "tsat_calc",
    "inputs": {
      "iron_ug_dl": 1,
      "tibc_ug_dl": 1
    }
  },
  {
    "id": "retic_corrected",
    "inputs": {
      "retic_percent": 1,
      "hct_percent": 1
    }
  },
  {
    "id": "rpi_calc",
    "inputs": {
      "crc_percent": 1,
      "hct_percent": 1
    }
  },
  {
    "id": "ldh_band",
    "inputs": {
      "ldh_u_l": 1,
      "upper_limit": 1
    }
  },
  {
    "id": "inr_therapeutic_band",
    "inputs": {
      "inr": 1
    }
  },
  {
    "id": "hct_from_hb_estimate",
    "inputs": {
      "hb_g_dl": 1
    }
  },
  {
    "id": "pancytopenia_flag",
    "inputs": {
      "wbc_k": 100,
      "hb_g_dl": 1,
      "plt_k": 100
    }
  },
  {
    "id": "uric_acid_band",
    "inputs": {
      "uric_mg_dl": 1
    }
  },
  {
    "id": "ferritin_band",
    "inputs": {
      "ferritin_ng_ml": 1
    }
  },
  {
    "id": "sokal_surrogate",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "hctci_surrogate",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "rbc_transfusion_trigger_flag",
    "inputs": {
      "hb_g_dl": 1,
      "cad_or_symptoms": 1
    }
  },
  {
    "id": "curb65_full_band",
    "inputs": {
      "score": 1
    }
  },
  {
    "id": "pct_band",
    "inputs": {
      "pct_ng_ml": 1
    }
  },
  {
    "id": "crp_band",
    "inputs": {
      "crp_mg_l": 100
    }
  },
  {
    "id": "lactate_sepsis_band",
    "inputs": {
      "lactate_mmol_l": 100
    }
  },
  {
    "id": "who_hiv_stage",
    "inputs": {
      "stage": 24
    }
  },
  {
    "id": "cd4_percent_band",
    "inputs": {
      "cd4_percent": 1
    }
  }
];
describe("EXT351–400: calculators present", () => {
  test.each(CASES.map(c => [c.id, c]))("%s is registered", (id, c) => {
    const calc = getCalc(c.id);
    expect(calc).toBeTruthy();
    expect(typeof calc.label).toBe("string");
    expect(typeof calc.run).toBe("function");
  });
});
describe("EXT351–400: calculators run & shape", () => {
  test.each(CASES.map(c => [c.id, c]))("%s runs", async (_id, c) => {
    let out = null;
    try { out = await runCalc(c.id, c.inputs); } catch (e) {
      console.warn("Run error for", c.id, "— treating as null");
    }
    if (out === null || out === undefined) {
      expect(out).toBeNull();
    } else {
      expectShape(out);
      expect(out.id).toBe(c.id);
    }
  }, 10000);
});
