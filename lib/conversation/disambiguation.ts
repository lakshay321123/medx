export function disambiguate(userMsg: string, context: string): string | null {
  if (/spicy/i.test(userMsg)) {
    return "Got it — do you mean more chili in the marinade, or extra heat in the sauce?";
  }
  if (/expand|more/i.test(userMsg) && context.includes("recipe")) {
    return "Do you want me to add more steps, or give alternative ingredients?";
  }
  return null;
}
