export function NearbyCards({ items }: { items: Array<any> }) {
  return (
    <div className="grid gap-3 mt-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="font-medium">{it.title}</div>
          <div className="text-sm opacity-70">{it.subtitle}</div>
          {it.address && <div className="text-sm mt-1">{it.address}</div>}
          <div className="text-sm mt-2 flex gap-3">
            {it.phone && <a className="underline" href={`tel:${it.phone}`}>Call</a>}
            {it.website && <a className="underline" href={it.website} target="_blank">Website</a>}
            <a className="underline" href={it.mapsUrl} target="_blank">Open in Maps</a>
          </div>
        </div>
      ))}
    </div>
  );
}
