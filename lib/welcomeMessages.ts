export const WELCOME_MESSAGES = [
  `Welcome to MedX — your AI-powered medical assistant.  
Upload lab reports, prescriptions, or X-rays and get instant, structured summaries.  
Ask questions about symptoms, medicines, or health tips, and even find nearby hospitals or pharmacies.  
Switch between **Patient Mode** for simple clarity or **Doctor Mode** for professional-level insights.`,

  `This is MedX, built to simplify healthcare.  
You can upload tests, prescriptions, or scans for AI-driven explanations.  
Ask about conditions, treatments, or local health resources, and get answers tailored to your country.  
Choose **Patient Mode** for easy summaries or **Doctor Mode** for detailed analysis.`,

  `Welcome to MedX, your intelligent health companion.  
From blood tests to X-rays, upload documents for instant, AI-powered reports.  
Ask medical questions, explore safe next steps, or locate doctors and pharmacies near you.  
Switch between **Patient** and **Doctor** modes anytime for the level of detail you need.`,
];

export function getRandomWelcome(): string {
  const idx = Math.floor(Math.random() * WELCOME_MESSAGES.length);
  return WELCOME_MESSAGES[idx];
}
