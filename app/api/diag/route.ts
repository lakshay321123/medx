import { NextResponse } from 'next/server';
export const runtime = 'edge';
export async function GET() {
  return NextResponse.json({
    featureNearby: process.env.FEATURE_NEARBY,
    featureIpLocate: process.env.FEATURE_IP_LOCATE,
    overpassUA: process.env.OVERPASS_USER_AGENT,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL
  });
}
