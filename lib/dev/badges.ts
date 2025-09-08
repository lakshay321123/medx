export function badges({ ctxLen, usedCompute, styles }: { ctxLen: number; usedCompute: boolean; styles: string[] }) {
  const pills: string[] = [];
  if (ctxLen > 0) pills.push(`CTX:${Math.min(ctxLen, 15000)}`);
  if (usedCompute) pills.push('CALC');
  if (styles.length) pills.push(styles.join('+'));
  return pills;
}
