import type { ProposedAction } from "./types";

export type PendingAction = ProposedAction & { sourceMsgId: string };

let pending: PendingAction | null = null;

export function setPendingAction(sourceMsgId: string, pa?: ProposedAction) {
  pending = pa ? { ...pa, sourceMsgId } : null;
}
export function getPendingAction() { return pending; }
export function clearPendingAction() { pending = null; }
export function isExpired(pa: PendingAction) {
  return pa.expiresAt && pa.expiresAt < Date.now();
}
