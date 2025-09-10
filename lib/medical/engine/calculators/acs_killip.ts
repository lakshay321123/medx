
import { register } from "../registry";

export function runKillip({ class_num }:{ class_num:1|2|3|4 }){
  if (class_num==null) return null;
  const map: Record<number,string> = {
    1:"No rales/S3",
    2:"Rales <50% lung fields or S3",
    3:"Pulmonary edema",
    4:"Cardiogenic shock"
  };
  return { Killip: class_num, description: map[class_num] };
}

register({ id:"killip_class", label:"Killip class", inputs:[{key:"class_num",required:true}], run: runKillip as any });
