import { NextResponse } from "next/server";

export async function GET() {
  // return static sample so FE integration has a stable shape
  return NextResponse.json({
    data: [
      {
        id: "stub",
        name: "Sample Clinic",
        type: "doctor",
        rating: 4.2,
        distance_m: 800,
        open_now: true,
        address_short: "MG Road",
        geo: { lat: 28.56, lng: 77.21 },
        source: "osm",
      },
    ],
    updatedAt: new Date().toISOString(),
  });
}
