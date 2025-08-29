'use client';

export default function Sources({ items }: { items: { label: string; href: string }[] }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
      {items.map((s, i) => (
        <a
          key={i}
          href={s.href}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '6px 10px',
            border: '1px solid var(--border)',
            borderRadius: 999,
            background: 'var(--card)',
            color: 'inherit',
            textDecoration: 'none',
            fontSize: 13
          }}
        >
          {s.label}
        </a>
      ))}
    </div>
  );
}
