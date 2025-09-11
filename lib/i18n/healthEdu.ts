export async function translateFields<T extends { [key:string]: any }>(
  obj: T,
  lang: string,
  fields: string[]
): Promise<T> {
  if (lang === 'en') return obj;
  const textBlocks = fields.map(k => {
    const v = (obj as any)[k];
    if (Array.isArray(v)) return v.join('\n');
    return v || '';
  });
  const body = { textBlocks, target: lang };
  const t0 = Date.now();
  let blocks: string[] = [];
  let fallback = false;
  try {
    const r = await fetch('/api/translate', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (Array.isArray(j.blocks)) blocks = j.blocks as string[];
    else fallback = true;
  } catch {
    fallback = true;
  }
  fields.forEach((k, i) => {
    const orig = (obj as any)[k];
    const t = blocks[i];
    if (Array.isArray(orig)) {
      (obj as any)[k] = t ? t.split('\n') : orig;
    } else {
      (obj as any)[k] = t || orig;
    }
    if (!t || t.trim() === '') fallback = true;
  });
  const ms = Date.now() - t0;
  console.log({ feature: 'healthEdu', lang, blocks: textBlocks.length, ms });
  if (fallback) {
    (obj as any).meta = { ...(obj as any).meta, translation: 'fallback' };
  }
  return obj;
}
