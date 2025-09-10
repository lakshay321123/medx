
import { register } from "../registry";

export type mNUTRICInputs = {
  age_years:number,
  apache_ii:number, // supply from your scoring engine
  sofa:number,      // total SOFA (use sofa_full)
  comorbidities_count:number,
  days_from_hospital_to_icu:number
};

export function runModifiedNUTRIC(i:mNUTRICInputs){
  if (Object.values(i).some(v=>v==null || !isFinite(v as number))) return null;
  let pts = 0;
  pts += i.age_years>=75?3 : i.age_years>=65?2 : i.age_years>=50?1 : 0;
  pts += i.apache_ii>=28?3 : i.apache_ii>=20?2 : i.apache_ii>=15?1 : 0;
  pts += i.sofa>=10?3 : i.sofa>=6?2 : i.sofa>=2?1 : 0;
  pts += i.comorbidities_count>=2?1:0;
  pts += i.days_from_hospital_to_icu>=1?1:0;
  const high_risk = pts>=5;
  return { mNUTRIC: pts, high_risk };
}

register({ id:"nutric_modified", label:"NUTRIC (modified)", inputs:[
  {key:"age_years",required:true},{key:"apache_ii",required:true},{key:"sofa",required:true},
  {key:"comorbidities_count",required:true},{key:"days_from_hospital_to_icu",required:true}
], run: runModifiedNUTRIC as any });
