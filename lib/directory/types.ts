export type DirectoryPlaceType = "doctor" | "pharmacy" | "lab";

export type DirectoryPlace = {
  id: string;
  name: string;
  type: DirectoryPlaceType;
  specialties: string[];
  rating: number | null;
  reviews_count: number | null;
  price_level: number | null;
  distance_m: number | null;
  open_now: boolean | null;
  hours: Record<string, string> | null;
  phones: string[];
  whatsapp: string | null;
  address_short: string | null;
  geo: { lat: number; lng: number } | null;
  amenities: string[];
  services: string[];
  images: string[];
  source: "osm" | "google";
  last_checked: string | null;
  rank_score: number;
  raw?: Record<string, unknown>;
};

export type DirectorySearchParams = {
  type: DirectoryPlaceType;
  lat: number;
  lng: number;
  radius: number;
  query?: string;
};

export type DirectorySearchResponse = {
  results: DirectoryPlace[];
  attribution: string;
};
