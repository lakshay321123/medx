export function isFollowUp(text: string): boolean {
  const q = text.trim().toLowerCase();
  const patterns = [
    /\bon (this|that|it|the above|the same)\b/,
    /\b(continue|research further|dig deeper|expand|elaborate|more details)\b/,
    /\b(latest (studies|clinical trials|guidelines|research|evidence))\b/,
    /\b(what next|next steps|compare|alternatives|side effects|prognosis)\b/,
  ];
  return patterns.some(re => re.test(q));
}
