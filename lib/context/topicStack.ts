import { db } from "@/lib/db";
import { getUserId } from "@/lib/getUserId";

const KEY = "state:topic_stack";

type TopicNode = { id: string; title: string; createdAt: string };
type TopicStack = { active: number; nodes: TopicNode[] };

function empty(): TopicStack {
  return { active: -1, nodes: [] };
}

export async function loadTopicStack(threadId: string): Promise<TopicStack> {
  const userId = await getUserId();
  if (!userId) return empty();

  const sb = db();
  const { data } = await sb
    .from("medx_memory")
    .select("value")
    .eq("user_id", userId)
    .eq("scope", "thread")
    .eq("thread_id", threadId)
    .eq("key", KEY)
    .maybeSingle();

  const v: any = data?.value;
  if (!v) return empty();
  return (v?.stack ?? v) as TopicStack;
}

export async function saveTopicStack(threadId: string, stack: TopicStack) {
  const userId = await getUserId();
  if (!userId) return;

  const sb = db();
  await sb.from("medx_memory").upsert(
    {
      user_id: userId,
      scope: "thread",
      thread_id: threadId,
      key: KEY,
      value: { stack },
    },
    { onConflict: "user_id,scope,thread_id,key" }
  );
}

export function pushTopic(stack: TopicStack, title: string): TopicStack {
  const node: TopicNode = { id: Math.random().toString(36).slice(2, 10), title, createdAt: new Date().toISOString() };
  const nodes = [...stack.nodes.slice(0, Math.max(0, stack.active + 1)), node];
  return { active: nodes.length - 1, nodes };
}

export function switchTo(stack: TopicStack, id: string): TopicStack {
  const idx = stack.nodes.findIndex((n) => n.id === id);
  if (idx < 0) return stack;
  return { ...stack, active: idx };
}

export function titleOf(stack: TopicStack): string {
  if (stack.active < 0 || stack.active >= stack.nodes.length) return "";
  return stack.nodes[stack.active]?.title ?? "";
}
