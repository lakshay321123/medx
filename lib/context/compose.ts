export function buildContextBlock(fullChat: string, profile?: string) {
  const parts: string[] = [];
  if (profile) parts.push(`USER PROFILE:\n${profile}`);
  if (fullChat) parts.push(`RECENT CHAT:\n${fullChat.slice(0, 15000)}`);
  return parts.length ? `\n\nCONTEXT\n${parts.join('\n\n')}` : "";
}

