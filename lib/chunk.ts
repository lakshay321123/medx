export interface PageChunk {
  text: string;
  page_range: string;
}

interface PageText {
  page: number;
  text: string;
}

const MAX_DOC_TOKENS = parseInt(process.env.DOC_MAX_TOKENS || '8192', 10);
const CHUNK_TOKENS = parseInt(process.env.DOC_CHUNK_TOKENS || '1200', 10);
const CHUNK_OVERLAP = parseInt(process.env.DOC_CHUNK_OVERLAP || '120', 10);
const DEBUG = process.env.DOC_ENABLE_DEBUG === 'true';

// Naive whitespace tokenization chunker with overlap and page range tracking
export function chunkPages(pages: PageText[]): PageChunk[] {
  const tokens: Array<{ token: string; page: number }> = [];
  for (const p of pages) {
    const words = p.text.split(/\s+/).filter(Boolean);
    for (const w of words) tokens.push({ token: w, page: p.page });
  }
  if (tokens.length > MAX_DOC_TOKENS) tokens.splice(MAX_DOC_TOKENS);

  const chunks: PageChunk[] = [];
  let i = 0;
  while (i < tokens.length) {
    const end = Math.min(i + CHUNK_TOKENS, tokens.length);
    const slice = tokens.slice(i, end);
    const text = slice.map((t) => t.token).join(' ');
    const pStart = slice[0].page;
    const pEnd = slice[slice.length - 1].page;
    const range = pStart === pEnd ? `p${pStart}` : `p${pStart}-p${pEnd}`;
    chunks.push({ text, page_range: range });
    if (DEBUG) console.log('chunk', chunks.length, range, 'tokens', slice.length);
    if (end === tokens.length) break;
    i = Math.max(0, end - CHUNK_OVERLAP);
  }
  return chunks;
}
