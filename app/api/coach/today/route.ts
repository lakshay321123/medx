import { NextResponse } from 'next/server';

const TIPS = [
  'Take a short walk today to keep active.',
  'Stay hydrated—drink a glass of water now.',
  'Choose a fruit for a healthy snack.'
];

function pickTip(date: string) {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const idx = Math.abs(h) % TIPS.length;
  return TIPS[idx];
}

export async function GET() {
  const today = new Date().toISOString().slice(0,10);
  const tip = pickTip(today);
  return NextResponse.json({ tip });
}
