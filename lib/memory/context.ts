import { findLatestByTag, getLastAnswer } from "./answerRegistry";
import { buildFullContext } from "./shortTerm"; // already in your repo

export function buildChatContextForPrompt(threadId: string, hintTag?: string) {
  const full = buildFullContext(threadId); // entire dialog (capped in that util)
  let featured = "";

  if (hintTag) {
    const snap = findLatestByTag(threadId, hintTag as any);
    if (snap) featured =
`----- Featured prior answer (${hintTag}) -----
${snap.content}
----- /featured -----
`;
  } else {
    // default: last answer as anchor
    const last = getLastAnswer(threadId);
    if (last) featured =
`----- Featured prior answer -----
${last.content}
----- /featured -----
`;
  }

  return `${featured}\n${full}`.trim();
}

