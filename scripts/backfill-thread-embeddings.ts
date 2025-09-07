/**
 * Backfill embeddings for old threads without topicEmbedding.
 * Run once: npx tsx scripts/backfill-thread-embeddings.ts
 */
import { prisma } from "@/lib/prisma";
import { embed } from "@/lib/memory/embeddings";

async function main() {
  const threads = await prisma.chatThread.findMany({
    where: { topicEmbedding: null },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 5 } },
  });

  console.log(`Found ${threads.length} threads missing embeddings`);

  for (const t of threads) {
    const seedText =
      t.messages.map((m) => `${m.role}: ${m.content}`).join("\n") ||
      t.title ||
      "Untitled";

    const v = await embed(seedText);
    await prisma.chatThread.update({
      where: { id: t.id },
      data: { topicEmbedding: Buffer.from(new Float32Array(v).buffer) },
    });

    console.log(`✅ Backfilled ${t.id} (${t.title || "Untitled"})`);
  }

  console.log("🎉 Done backfilling thread embeddings.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
