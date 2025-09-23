function safeTitleFromUrl(url?: string): string {
  if (!url) return 'Source';
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
}

function toLine(value: unknown, label: string): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? `**${label}:** ${trimmed}` : null;
}

export function formatTrialBriefMarkdown(nctId: string, brief: unknown): string {
  const heading = `### ${nctId} — Clinical Brief`;
  if (!brief || typeof brief !== 'object') {
    const fallback = String(brief ?? '').trim();
    return [heading, fallback].filter(Boolean).join('\n\n');
  }

  const data = brief as Record<string, any>;
  const bullets = Array.isArray(data.bullets)
    ? data.bullets
        .slice(0, 3)
        .map((b: unknown) => `- ${String(b ?? '').trim()}`)
        .filter(line => line.trim() !== '-')
        .join('\n')
    : '';

  const details = typeof data.details === 'object' && data.details !== null ? data.details : {};
  const detailLines = [
    toLine(details.design, 'Design'),
    toLine(details.population, 'Population'),
    toLine(details.interventions, 'Interventions'),
    toLine(details.primary_outcomes, 'Primary outcomes'),
    toLine(details.key_eligibility, 'Key eligibility'),
  ]
    .filter(Boolean)
    .join('\n');

  const citations = Array.isArray(data.citations)
    ? data.citations
        .slice(0, 5)
        .map((c: any, index: number) => {
          const label = typeof c?.title === 'string' && c.title.trim() ? c.title.trim() : safeTitleFromUrl(c?.url);
          const url = typeof c?.url === 'string' ? c.url : '';
          const suffix = url ? ` — ${url}` : '';
          return `[${index + 1}] ${label}${suffix}`;
        })
        .join('\n')
    : '';

  const sections = [
    heading,
    typeof data.tldr === 'string' && data.tldr.trim() ? `**TL;DR:** ${data.tldr.trim()}` : '',
    bullets,
    detailLines,
    citations ? `**Sources**\n${citations}` : '',
  ].filter(Boolean);

  if (sections.length === 0) return heading;
  return sections.join('\n\n');
}
