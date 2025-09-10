
import { register } from "../registry";

export type PAO2Inputs = { FiO2: number, Patm_mmHg?: number, PH2O_mmHg?: number, PaCO2_mmHg: number, RQ?: number };
export function runPAO2Alveolar({ FiO2, Patm_mmHg=760, PH2O_mmHg=47, PaCO2_mmHg, RQ=0.8 }: PAO2Inputs){
  if ([FiO2,Patm_mmHg,PH2O_mmHg,PaCO2_mmHg,RQ].some(v=>v==null || !isFinite(v as number))) return null;
  const PAO2 = FiO2 * (Patm_mmHg - PH2O_mmHg) - (PaCO2_mmHg / RQ);
  return { PAO2_mmHg: Number(PAO2.toFixed(1)) };
}

export function runAAGradient({ PaO2_mmHg, PAO2_mmHg }:{ PaO2_mmHg:number, PAO2_mmHg:number }){
  if ([PaO2_mmHg,PAO2_mmHg].some(v=>v==null || !isFinite(v as number))) return null;
  const grad = PAO2_mmHg - PaO2_mmHg;
  return { A_a_gradient_mmHg: Number(grad.toFixed(1)) };
}

register({ id:"pao2_alveolar", label:"Alveolar oxygen (PAO₂)", inputs:[{key:"FiO2",required:true},{key:"PaCO2_mmHg",required:true},{key:"Patm_mmHg"},{key:"PH2O_mmHg"},{key:"RQ"}], run: runPAO2Alveolar as any });
register({ id:"a_a_gradient", label:"A–a gradient", inputs:[{key:"PaO2_mmHg",required:true},{key:"PAO2_mmHg",required:true}], run: runAAGradient as any });
