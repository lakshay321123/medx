export async function getDrugLabels() {
  const key = process.env.OPENFDA_API_KEY || '';
  const url = `https://api.fda.gov/drug/label.json?limit=5${key?`&api_key=${key}`:''}`;
  const res = await fetch(url, { next: { revalidate: 300 }});
  if (!res.ok) throw new Error("openFDA API error");
  return res.json();
}
