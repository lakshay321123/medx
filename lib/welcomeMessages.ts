// lib/welcomeMessages.ts
export const WELCOME_MESSAGES = [
  `Get a Second Opinion—first.
You can upload tests, prescriptions, or scans for AI-driven explanations.
Ask about conditions, treatments, or local health resources, and get answers tailored to your country.
Choose Patient Mode for easy summaries or Doctor Mode for detailed analysis.`,

  `Because one opinion isn’t always enough.
You can upload tests, prescriptions, or scans for AI-driven explanations.
Ask about conditions, treatments, or local health resources, and get answers tailored to your country.
Choose Patient Mode for easy summaries or Doctor Mode for detailed analysis.`,

  `Your first stop for a Second Opinion.
You can upload tests, prescriptions, or scans for AI-driven explanations.
Ask about conditions, treatments, or local health resources, and get answers tailored to your country.
Choose Patient Mode for easy summaries or Doctor Mode for detailed analysis.`,
];

export const getRandomWelcome = () =>
  WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
