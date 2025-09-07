export function acknowledgmentLayer(msg: string): string | null {
  const lower = msg.toLowerCase();
  if (["thanks", "thank you"].includes(lower)) {
    return "Appreciate that 🙏 Want me to expand on it?";
  }
  if (["nice", "great", "exactly"].includes(lower)) {
    return "Glad it landed well! Should I refine this further?";
  }
  if (["ok", "okay", "sure"].includes(lower)) {
    return "Got it 👍 Want me to continue?";
  }
  return null;
}
