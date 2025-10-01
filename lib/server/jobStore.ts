import { randomUUID } from "crypto";

type JobStatus = "queued" | "running" | "done" | "error";

type StoredJob = {
  jobId: string;
  route: string;
  idemKey: string;
  status: JobStatus;
  payload?: any;
  statusCode?: number;
  responseText?: string;
  errorText?: string;
  conversationId?: string | null;
  updatedAt: number;
  createdAt: number;
};

type JobStore = {
  jobs: Map<string, StoredJob>;
  index: Map<string, string>;
};

function getStore(): JobStore {
  const globalObj = globalThis as unknown as { __medxJobStore?: JobStore };
  if (!globalObj.__medxJobStore) {
    globalObj.__medxJobStore = {
      jobs: new Map<string, StoredJob>(),
      index: new Map<string, string>(),
    };
  }
  return globalObj.__medxJobStore;
}

export type EnsureJobResult =
  | { status: "no-key"; jobId: null }
  | { status: "new"; jobId: string }
  | { status: "pending"; jobId: string }
  | { status: "done"; jobId: string; payload: any; statusCode?: number; conversationId?: string | null }
  | { status: "error"; jobId: string; payload?: any; statusCode?: number; errorText?: string; conversationId?: string | null };

export function ensureJob(route: string, idemKey?: string | null): EnsureJobResult {
  if (!idemKey) {
    return { status: "no-key", jobId: null };
  }
  const store = getStore();
  const key = `${route}:${idemKey}`;
  const existingId = store.index.get(key);
  if (existingId) {
    const job = store.jobs.get(existingId);
    if (!job) {
      store.index.delete(key);
      return ensureJob(route, idemKey);
    }
    if (job.status === "done") {
      return { status: "done", jobId: job.jobId, payload: job.payload, statusCode: job.statusCode, conversationId: job.conversationId ?? null };
    }
    if (job.status === "error") {
      return {
        status: "error",
        jobId: job.jobId,
        payload: job.payload,
        statusCode: job.statusCode,
        errorText: job.errorText,
        conversationId: job.conversationId ?? null,
      };
    }
    return { status: "pending", jobId: job.jobId };
  }

  const jobId = randomUUID();
  const now = Date.now();
  const job: StoredJob = {
    jobId,
    route,
    idemKey,
    status: "queued",
    updatedAt: now,
    createdAt: now,
  };
  store.jobs.set(jobId, job);
  store.index.set(key, jobId);
  return { status: "new", jobId };
}

export function markJobRunning(jobId: string | null | undefined) {
  if (!jobId) return;
  const store = getStore();
  const job = store.jobs.get(jobId);
  if (!job) return;
  job.status = "running";
  job.updatedAt = Date.now();
  store.jobs.set(jobId, job);
}

export function markJobDone(
  jobId: string | null | undefined,
  payload: any,
  statusCode = 200,
  options: { responseText?: string; conversationId?: string | null } = {},
) {
  if (!jobId) return;
  const store = getStore();
  const job = store.jobs.get(jobId);
  if (!job) return;
  job.status = "done";
  job.payload = payload;
  job.statusCode = statusCode;
  job.responseText = options.responseText;
  job.conversationId = options.conversationId ?? null;
  job.updatedAt = Date.now();
  store.jobs.set(jobId, job);
}

export function markJobError(
  jobId: string | null | undefined,
  payload: any,
  statusCode = 500,
  options: { errorText?: string; conversationId?: string | null } = {},
) {
  if (!jobId) return;
  const store = getStore();
  const job = store.jobs.get(jobId);
  if (!job) return;
  job.status = "error";
  job.payload = payload;
  job.statusCode = statusCode;
  job.errorText = options.errorText ?? "Network error";
  job.conversationId = options.conversationId ?? null;
  job.updatedAt = Date.now();
  store.jobs.set(jobId, job);
}

export function getJob(jobId: string | null | undefined) {
  if (!jobId) return null;
  const store = getStore();
  return store.jobs.get(jobId) ?? null;
}
