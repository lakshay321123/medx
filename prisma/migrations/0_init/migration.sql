-- Create tables
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT UNIQUE,
  "image" TEXT,
  "role" TEXT NOT NULL DEFAULT 'patient',
  "consentFlags" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Account" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId")
);

CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "VerificationToken_token_key" UNIQUE ("token"),
  CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE ("identifier", "token")
);

CREATE TABLE "Thread" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Thread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "Thread_user_lastActivity_idx" ON "Thread"("userId", "lastActivityAt" DESC);

CREATE TABLE "Message" (
  "id" TEXT PRIMARY KEY,
  "threadId" TEXT NOT NULL,
  "senderType" TEXT NOT NULL,
  "text" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE
);

CREATE INDEX "Message_thread_createdAt_idx" ON "Message"("threadId", "createdAt");

CREATE TABLE "Attachment" (
  "id" TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE
);

CREATE TABLE "Prediction" (
  "id" TEXT PRIMARY KEY,
  "threadId" TEXT NOT NULL,
  "inputMessageId" TEXT,
  "model" TEXT NOT NULL,
  "riskScore" INTEGER NOT NULL,
  "band" TEXT NOT NULL,
  "factors" JSONB,
  "recommendations" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Prediction_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE,
  CONSTRAINT "Prediction_inputMessageId_fkey" FOREIGN KEY ("inputMessageId") REFERENCES "Message"("id")
);

CREATE INDEX "Prediction_thread_createdAt_idx" ON "Prediction"("threadId", "createdAt");

CREATE TABLE "Observation" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "observedAt" TIMESTAMPTZ NOT NULL,
  "source" TEXT NOT NULL,
  CONSTRAINT "Observation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "Observation_user_observedAt_idx" ON "Observation"("userId", "observedAt" DESC);

CREATE TABLE "Alert" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "threadId" TEXT,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "resolvedAt" TIMESTAMPTZ,
  CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Alert_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE
);

CREATE INDEX "Alert_user_status_createdAt_idx" ON "Alert"("userId", "status", "createdAt" DESC);
