export function withContextRetention(baseHandler: (ctx: any) => any) {
  return async (ctx: any) => {
    const msg = ctx.lastUserMessage?.trim().toLowerCase();
    if (["ok", "okay", "yes", "sure", "nice", "thanks", "thank you"].includes(msg)) {
      ctx.meta = ctx.meta || {};
      ctx.meta.addAcknowledgment = true;
    }
    return baseHandler(ctx);
  };
}
