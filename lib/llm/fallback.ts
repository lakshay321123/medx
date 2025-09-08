type OAIishError = Error & { status?: number; code?: string; error?: { code?: string } };

export function shouldModelFallback(err: OAIishError) {
  const code = err?.code || err?.error?.code;
  return err?.status === 404 || code === "model_not_found" || code === "invalid_model";
}
