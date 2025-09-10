import type { CalculatorRegistry } from "./types";
import { runRcri } from "./rcri";
import { runAriscat } from "./ariscat";
import { runStopBang } from "./stop_bang";
import { runFreeWaterDeficit } from "./free_water_deficit";
import { runBicarbonateDeficit } from "./bicarbonate_deficit";
import { runFeNa } from "./fe_na";
import { runFeUrea } from "./fe_urea";
import { runUrineAnionGap } from "./urine_anion_gap";
import { runSerumOsmolalityAdvanced } from "./serum_osmolality_advanced";
import { runOsmolalGap } from "./osmolal_gap";
import { runCorrectedCalcium } from "./corrected_calcium";
import { runDeltaGap } from "./delta_gap";
import { runSodiumCorrectionRate } from "./sodium_correction_rate";
import { runMaintenanceFluids421 } from "./maintenance_fluids_421";
import { runBSAMosteller } from "./bsa_mosteller";
import { runCockcroftGault } from "./cockcroft_gault";
import { runIBWDevine } from "./ideal_body_weight_devine";
import { runAdjustedBodyWeight } from "./adjusted_body_weight";
import { runQTcBazettFramingham } from "./qtc_bazett_framingham";
import { runSodiumDeficit } from "./sodium_deficit";
import { runPAS } from "./pas_appendicitis";
import { runPRAM } from "./pram_asthma";
import { runPEWS } from "./pews_full";
import { runPediatricGCS } from "./pediatric_gcs";
import { runNEXUS } from "./nexus_cspine";
import { runCCHR } from "./canadian_ct_head";
import { runTIMI } from "./timi_ua_nstemi";
import { runHEART } from "./heart_score";
import { runCHA2DS2VASc } from "./cha2ds2_vasc";
import { runHASBLED } from "./has_bled";
import { runMeldNa } from "./meld_na";
import { runChildPugh } from "./child_pugh";
import { runAAGradient } from "./aa_gradient";
import { runPFRatio } from "./pf_ratio";
import { runWellsDVT } from "./wells_dvt";
import { runWellsPE } from "./wells_pe";
import { runYEARS } from "./years_pe";
import { runBAP65 } from "./bap65_copd";
import { runNEWS2 } from "./news2";
import { runSOFA } from "./sofa_simple";
import { runEGFR_CKDEPI_2021 } from "./egfr_ckd_epi_2021";
import { runEGFR_MDRD } from "./egfr_mdrd";
import { runAims65 } from "./aims65";
import { runCrb65 } from "./crb65";
import { runApfelPONV } from "./apfel_ponv";
import { runAgeAdjustedDDimer } from "./age_adjusted_ddimer";
import { runShockIndex } from "./shock_index";
import { runMAP } from "./map_calc";
import { runAnionGapCorrected } from "./anion_gap_corrected";
import { runHendersonHasselbalch } from "./hh_ph";
import { runCaO2 } from "./cao2";
import { runDO2 } from "./do2";
import { runTTKG } from "./ttkg";
import { runUrineOsmolalityEstimate } from "./urine_osmolality_estimate";
import { runPhenytoinSheinerTozer } from "./phenytoin_sheiner_tozer";
import { runCalciumPhosphateProduct } from "./calcium_phosphate_product";
import { runBMI } from "./bmi";
import { runHarrisBenedict } from "./harris_benedict";
import { runMifflinStJeor } from "./mifflin_st_jeor";
import { runHollidaySegar } from "./maintenance_fluids_holliday_segar";
import { runABCD2 } from "./abcd2_tia";
import { runNIHSS } from "./nihss_total";
import { runOttawaSAH } from "./ottawa_sah_rule";
import { runPadua } from "./padua_vte";
import { runqSOFA } from "./qsofa";
import { runNUTRIC } from "./nutric_simplified";
import { runNAFLD_Fibrosis } from "./nafld_fibrosis_score";
import { runDeRitis } from "./de_ritis_ratio";
import { runLDL_Friedewald } from "./ldl_friedewald";
import { runNonHDL } from "./non_hdl";
import { runHOMA_IR } from "./homa_ir";
import { runTGHdlRatio } from "./tg_hdl_ratio";
import { runNLR } from "./nlr";
import { runPLR } from "./plr";
import { runLactateClearance } from "./lactate_clearance";
import { runHAPS } from "./haps_pancreatitis";
import { runRockallPost } from "./rockall_post";
import { runBODE } from "./bode_index";
import { runQTcFridericia } from "./qtc_fridericia";
import { runAlvarado } from "./alvarado_appendicitis";

export const calculators: CalculatorRegistry = {
  "rcri": { id: "rcri", name: "Rcri", run: runRcri, tags: [] },
  "ariscat": { id: "ariscat", name: "Ariscat", run: runAriscat, tags: [] },
  "stop_bang": { id: "stop_bang", name: "Stop Bang", run: runStopBang, tags: [] },
  "free_water_deficit": { id: "free_water_deficit", name: "Free Water Deficit", run: runFreeWaterDeficit, tags: [] },
  "bicarbonate_deficit": { id: "bicarbonate_deficit", name: "Bicarbonate Deficit", run: runBicarbonateDeficit, tags: [] },
  "fe_na": { id: "fe_na", name: "Fe Na", run: runFeNa, tags: [] },
  "fe_urea": { id: "fe_urea", name: "Fe Urea", run: runFeUrea, tags: [] },
  "urine_anion_gap": { id: "urine_anion_gap", name: "Urine Anion Gap", run: runUrineAnionGap, tags: [] },
  "serum_osmolality_advanced": { id: "serum_osmolality_advanced", name: "Serum Osmolality Advanced", run: runSerumOsmolalityAdvanced, tags: [] },
  "osmolal_gap": { id: "osmolal_gap", name: "Osmolal Gap", run: runOsmolalGap, tags: [] },
  "corrected_calcium": { id: "corrected_calcium", name: "Corrected Calcium", run: runCorrectedCalcium, tags: [] },
  "delta_gap": { id: "delta_gap", name: "Delta Gap", run: runDeltaGap, tags: [] },
  "sodium_correction_rate": { id: "sodium_correction_rate", name: "Sodium Correction Rate", run: runSodiumCorrectionRate, tags: [] },
  "maintenance_fluids_421": { id: "maintenance_fluids_421", name: "Maintenance Fluids 421", run: runMaintenanceFluids421, tags: [] },
  "bsa_mosteller": { id: "bsa_mosteller", name: "Bsa Mosteller", run: runBSAMosteller, tags: [] },
  "cockcroft_gault": { id: "cockcroft_gault", name: "Cockcroft Gault", run: runCockcroftGault, tags: [] },
  "ideal_body_weight_devine": { id: "ideal_body_weight_devine", name: "Ideal Body Weight Devine", run: runIBWDevine, tags: [] },
  "adjusted_body_weight": { id: "adjusted_body_weight", name: "Adjusted Body Weight", run: runAdjustedBodyWeight, tags: [] },
  "qtc_bazett_framingham": { id: "qtc_bazett_framingham", name: "QTc Bazett Framingham", run: runQTcBazettFramingham, tags: [] },
  "sodium_deficit": { id: "sodium_deficit", name: "Sodium Deficit", run: runSodiumDeficit, tags: [] },
  "pas_appendicitis": { id: "pas_appendicitis", name: "Pas Appendicitis", run: runPAS, tags: [] },
  "pram_asthma": { id: "pram_asthma", name: "Pram Asthma", run: runPRAM, tags: [] },
  "pews_full": { id: "pews_full", name: "Pews Full", run: runPEWS, tags: [] },
  "pediatric_gcs": { id: "pediatric_gcs", name: "Pediatric Gcs", run: runPediatricGCS, tags: [] },
  "nexus_cspine": { id: "nexus_cspine", name: "Nexus Cspine", run: runNEXUS, tags: [] },
  "canadian_ct_head": { id: "canadian_ct_head", name: "Canadian Ct Head", run: runCCHR, tags: [] },
  "timi_ua_nstemi": { id: "timi_ua_nstemi", name: "Timi Ua Nstemi", run: runTIMI, tags: [] },
  "heart_score": { id: "heart_score", name: "Heart Score", run: runHEART, tags: [] },
  "cha2ds2_vasc": { id: "cha2ds2_vasc", name: "Cha2Ds2 Vasc", run: runCHA2DS2VASc, tags: [] },
  "has_bled": { id: "has_bled", name: "Has Bled", run: runHASBLED, tags: [] },
  "meld_na": { id: "meld_na", name: "Meld Na", run: runMeldNa, tags: [] },
  "child_pugh": { id: "child_pugh", name: "Child Pugh", run: runChildPugh, tags: [] },
  "aa_gradient": { id: "aa_gradient", name: "Aa Gradient", run: runAAGradient, tags: [] },
  "pf_ratio": { id: "pf_ratio", name: "Pf Ratio", run: runPFRatio, tags: [] },
  "wells_dvt": { id: "wells_dvt", name: "Wells Dvt", run: runWellsDVT, tags: [] },
  "wells_pe": { id: "wells_pe", name: "Wells Pe", run: runWellsPE, tags: [] },
  "years_pe": { id: "years_pe", name: "Years Pe", run: runYEARS, tags: [] },
  "bap65_copd": { id: "bap65_copd", name: "Bap65 Copd", run: runBAP65, tags: [] },
  "news2": { id: "news2", name: "News2", run: runNEWS2, tags: [] },
  "sofa_simple": { id: "sofa_simple", name: "Sofa Simple", run: runSOFA, tags: [] },
  "egfr_ckd_epi_2021": { id: "egfr_ckd_epi_2021", name: "eGFR CKD Epi 2021", run: runEGFR_CKDEPI_2021, tags: [] },
  "egfr_mdrd": { id: "egfr_mdrd", name: "eGFR Mdrd", run: runEGFR_MDRD, tags: [] },
  "aims65": { id: "aims65", name: "Aims65", run: runAims65, tags: [] },
  "crb65": { id: "crb65", name: "Crb65", run: runCrb65, tags: [] },
  "apfel_ponv": { id: "apfel_ponv", name: "Apfel Ponv", run: runApfelPONV, tags: [] },
  "age_adjusted_ddimer": { id: "age_adjusted_ddimer", name: "Age Adjusted Ddimer", run: runAgeAdjustedDDimer, tags: [] },
  "shock_index": { id: "shock_index", name: "Shock Index", run: runShockIndex, tags: [] },
  "map_calc": { id: "map_calc", name: "Map Calc", run: runMAP, tags: [] },
  "anion_gap_corrected": { id: "anion_gap_corrected", name: "Anion Gap Corrected", run: runAnionGapCorrected, tags: [] },
  "hh_ph": { id: "hh_ph", name: "Hh Ph", run: runHendersonHasselbalch, tags: [] },
  "cao2": { id: "cao2", name: "Cao2", run: runCaO2, tags: [] },
  "do2": { id: "do2", name: "Do2", run: runDO2, tags: [] },
  "ttkg": { id: "ttkg", name: "Ttkg", run: runTTKG, tags: [] },
  "urine_osmolality_estimate": { id: "urine_osmolality_estimate", name: "Urine Osmolality Estimate", run: runUrineOsmolalityEstimate, tags: [] },
  "phenytoin_sheiner_tozer": { id: "phenytoin_sheiner_tozer", name: "Phenytoin Sheiner Tozer", run: runPhenytoinSheinerTozer, tags: [] },
  "calcium_phosphate_product": { id: "calcium_phosphate_product", name: "Calcium Phosphate Product", run: runCalciumPhosphateProduct, tags: [] },
  "bmi": { id: "bmi", name: "Bmi", run: runBMI, tags: [] },
  "harris_benedict": { id: "harris_benedict", name: "Harris Benedict", run: runHarrisBenedict, tags: [] },
  "mifflin_st_jeor": { id: "mifflin_st_jeor", name: "Mifflin St Jeor", run: runMifflinStJeor, tags: [] },
  "maintenance_fluids_holliday_segar": { id: "maintenance_fluids_holliday_segar", name: "Maintenance Fluids Holliday Segar", run: runHollidaySegar, tags: [] },
  "abcd2_tia": { id: "abcd2_tia", name: "Abcd2 Tia", run: runABCD2, tags: [] },
  "nihss_total": { id: "nihss_total", name: "Nihss Total", run: runNIHSS, tags: [] },
  "ottawa_sah_rule": { id: "ottawa_sah_rule", name: "Ottawa Sah Rule", run: runOttawaSAH, tags: [] },
  "padua_vte": { id: "padua_vte", name: "Padua Vte", run: runPadua, tags: [] },
  "qsofa": { id: "qsofa", name: "Qsofa", run: runqSOFA, tags: [] },
  "nutric_simplified": { id: "nutric_simplified", name: "Nutric Simplified", run: runNUTRIC, tags: [] },
  "nafld_fibrosis_score": { id: "nafld_fibrosis_score", name: "Nafld Fibrosis Score", run: runNAFLD_Fibrosis, tags: [] },
  "de_ritis_ratio": { id: "de_ritis_ratio", name: "De Ritis Ratio", run: runDeRitis, tags: [] },
  "ldl_friedewald": { id: "ldl_friedewald", name: "Ldl Friedewald", run: runLDL_Friedewald, tags: [] },
  "non_hdl": { id: "non_hdl", name: "Non Hdl", run: runNonHDL, tags: [] },
  "homa_ir": { id: "homa_ir", name: "Homa Ir", run: runHOMA_IR, tags: [] },
  "tg_hdl_ratio": { id: "tg_hdl_ratio", name: "Tg Hdl Ratio", run: runTGHdlRatio, tags: [] },
  "nlr": { id: "nlr", name: "Nlr", run: runNLR, tags: [] },
  "plr": { id: "plr", name: "Plr", run: runPLR, tags: [] },
  "lactate_clearance": { id: "lactate_clearance", name: "Lactate Clearance", run: runLactateClearance, tags: [] },
  "haps_pancreatitis": { id: "haps_pancreatitis", name: "Haps Pancreatitis", run: runHAPS, tags: [] },
  "rockall_post": { id: "rockall_post", name: "Rockall Post", run: runRockallPost, tags: [] },
  "bode_index": { id: "bode_index", name: "Bode Index", run: runBODE, tags: [] },
  "qtc_fridericia": { id: "qtc_fridericia", name: "QTc Fridericia", run: runQTcFridericia, tags: [] },
  "alvarado_appendicitis": { id: "alvarado_appendicitis", name: "Alvarado Appendicitis", run: runAlvarado, tags: [] }
};

export function runCalculator(id: string, input: any) {
  const c = calculators[id];
  if (!c) throw new Error(`Calculator not found: ${id}`);
  return c.run(input);
}
