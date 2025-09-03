export function useGeolocate() {
  async function getCoords(): Promise<{ lat: number; lng: number }> {
    if (!("geolocation" in navigator)) throw new Error("Geolocation not supported.");
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error(err.message || "Location permission denied.")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    });
  }
  return { getCoords };
}
