import { prisma } from "@/lib/prisma";
import { embed } from "@/lib/memory/embeddings";

type AppendParams = {
  threadId: string;
  assistantContent: string;
  newSummary: string;
  expectedVersion?: number;
};

export async function appendAssistantAndUpdateSummaryAtomic({
  threadId,
  assistantContent,
  newSummary,
  expectedVersion,
}: AppendParams) {
  if (!prisma) {
    throw new Error("prisma_unavailable");
  }

  const prismaAny = prisma as any;
  const messageModel = prismaAny?.message;
  const threadModel = prismaAny?.chatThread;

  if (!messageModel?.create || !threadModel?.update) {
    throw new Error("prisma_models_missing");
  }

  const vector = await embed(assistantContent);
  const embedding = Buffer.from(new Float32Array(vector).buffer);

  const runAtomic = async (tx: any) => {
    if (typeof expectedVersion === "number" && tx?.chatThread?.findUnique) {
      const existing = await tx.chatThread.findUnique({
        where: { id: threadId },
        select: { version: true },
      });
      if (!existing || (typeof existing.version === "number" && existing.version !== expectedVersion)) {
        throw new Error("version_conflict");
      }
    }

    await tx.message.create({
      data: {
        threadId,
        role: "assistant",
        content: assistantContent,
        embedding,
      },
    });

    await tx.chatThread.update({
      where: { id: threadId },
      data: {
        runningSummary: newSummary,
        updatedAt: new Date(),
      },
    });
  };

  if (typeof prismaAny.$transaction === "function") {
    await prismaAny.$transaction(async (tx: any) => {
      await runAtomic(tx);
    });
    return;
  }

  if (typeof expectedVersion === "number" && threadModel?.findUnique) {
    const current = await threadModel.findUnique({
      where: { id: threadId },
      select: { version: true },
    });
    if (!current || (typeof current.version === "number" && current.version !== expectedVersion)) {
      throw new Error("version_conflict");
    }
  }

  await messageModel.create({
    data: {
      threadId,
      role: "assistant",
      content: assistantContent,
      embedding,
    },
  });

  await threadModel.update({
    where: { id: threadId },
    data: {
      runningSummary: newSummary,
      updatedAt: new Date(),
    },
  });
}
