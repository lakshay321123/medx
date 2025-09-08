export function detectTopic(_text: string): string | null { return null; }
export function wantsNewTopic(_text: string): boolean { return false; }
export function inferTopicFromHistory(_msgs: Array<{role:string; content:string}>): string | null { return null; }
export function seemsOffTopic(_text: string, _topic: string | null): boolean { return false; }
export function rewriteToTopic(text: string, _topic: string | null): string { return text; }
