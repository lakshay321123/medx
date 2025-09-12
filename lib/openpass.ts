export async function searchNearby(locationToken: string, query: string) {
  const res = await fetch("https://api.openpass.io/v1/nearby/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENPASS_API_KEY}`,
    },
    body: JSON.stringify({ locationToken, query }),
  });
  if (!res.ok) {
    throw new Error(`OpenPass search failed: ${res.status}`);
  }
  return res.json();
}

