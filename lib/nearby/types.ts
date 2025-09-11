export type NearbyType = "doctor" | "specialist" | "hospital" | "clinic" | "lab" | "pharmacy";
export type NearbyItem = {
  id: string; // osm:id (node/way/relation)
  osmType: "node" | "way" | "relation";
  type: NearbyType;
  name: string;
  specialty?: string; // parsed from healthcare:speciality
  address: string; // one-line
  phone?: string;
  location: { lat: number; lng: number };
  distance_km: number;
  website?: string;
  hours?: string;
};
export type NearbyResponse = {
  meta: { provider: "overpass"; radius_km: number; total: number; cached: boolean };
  items: NearbyItem[];
};
