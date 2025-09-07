import { prisma } from "@/lib/prisma";

const SCOPE = "topics";
const KEY = "stack";

type TopicNode = { id: string; title: string; createdAt: string };
type TopicStack = { active: number; nodes: TopicNode[] };

function empty(): TopicStack { return { active: -1, nodes: [] }; }

export async function loadTopicStack(threadId: string): Promise<TopicStack> {
  const rec = await prisma.memory.findUnique({
    where: { threadId_scope_key: { threadId, scope: SCOPE, key: KEY } },
  });
  if (!rec) return empty();
  try { return JSON.parse(rec.value) as TopicStack; } catch { return empty(); }
}

export async function saveTopicStack(threadId: string, stack: TopicStack) {
  await prisma.memory.upsert({
    where: { threadId_scope_key: { threadId, scope: SCOPE, key: KEY } },
    create: { threadId, scope: SCOPE, key: KEY, value: JSON.stringify(stack) },
    update: { value: JSON.stringify(stack) },
  });
}

export function pushTopic(stack: TopicStack, title: string): TopicStack {
  const node: TopicNode = { id: Math.random().toString(36).slice(2, 10), title, createdAt: new Date().toISOString() };
  const nodes = [...stack.nodes, node];
  return { active: nodes.length - 1, nodes };
}

export function switchTo(stack: TopicStack, id: string): TopicStack {
  const idx = stack.nodes.findIndex(n => n.id === id);
  if (idx === -1) return stack;
  return { ...stack, active: idx };
}

export function titleOf(stack: TopicStack): string | undefined {
  if (stack.active < 0 || stack.active >= stack.nodes.length) return undefined;
  return stack.nodes[stack.active].title;
}
