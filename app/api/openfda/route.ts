import { NextRequest, NextResponse } from 'next/server';
  export async function GET(){ const key=process.env.OPENFDA_API_KEY||''; const r=await fetch(`https://api.fda.gov/drug/label.json?limit=5${key?`&api_key=${key}`:''}`); const j=await r.json(); return NextResponse.json(j); }
