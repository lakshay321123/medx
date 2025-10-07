import type { ChatMessage } from '@/types/chat';

type MaybeChatMessage = ChatMessage & {
  kind?: string;
  pending?: boolean;
};

export function shouldFetchAdForMessage(msg: MaybeChatMessage | null | undefined): boolean {
  if (!msg) return false;
  if (msg.role !== 'assistant') return false;
  if (msg.kind !== 'chat') return false;
  if (msg.pending) return false;
  return typeof msg.id === 'string' && msg.id.length > 0;
}
