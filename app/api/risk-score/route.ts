import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { runBMI } from '@/lib/medical/engine/calculators/nutrition_metabolism';

export async function POST(req: NextRequest) {
  const { age, bp, lipids, smoker, diabetic, height_cm, weight_kg } = await req.json();
  const bmi = runBMI({ weight_kg, height_cm });
  const score = Math.round((age/10) + (bp/50) + (lipids?.total/50) - (lipids?.hdl/50) + (smoker?5:0) + (diabetic?5:0));
  const riskLevel = score >= 20 ? 'high' : score >= 10 ? 'moderate' : 'low';
  return NextResponse.json({ score, riskLevel, bmi: bmi?.bmi, bmiCategory: bmi?.category });
}
