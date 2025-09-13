ALTER TABLE "ChatThread" ADD COLUMN "type" TEXT DEFAULT 'chat';

CREATE TABLE "SessionFlag" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  UNIQUE("userId","threadId","key")
);
