import { BRAND_NAME } from "@/lib/brand";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold mb-6">{BRAND_NAME} — Terms of Service</h1>
      <div className="prose prose-slate dark:prose-invert prose-medx text-[15px] leading-[1.7]">
        <p>Last updated: March 23, 2026</p>
        
        <h2>1. Acceptance of Terms</h2>
        <p>By using {BRAND_NAME}, you agree to these Terms of Service. If you do not agree, do not use our service.</p>
        
        <h2>2. Medical Disclaimer</h2>
        <p>{BRAND_NAME} is an AI-powered health information assistant. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical decisions.</p>
        <p>The information provided is for educational purposes only. Never disregard professional medical advice or delay seeking it because of something you read on {BRAND_NAME}.</p>
        
        <h2>3. No Doctor-Patient Relationship</h2>
        <p>Using {BRAND_NAME} does not create a doctor-patient relationship. The AI assistant is not a licensed healthcare provider.</p>
        
        <h2>4. Data Privacy</h2>
        <p>Your health data is stored securely. We do not sell your personal health information to third parties. See our Privacy Policy for details.</p>
        
        <h2>5. Accuracy</h2>
        <p>While we strive for accuracy, AI-generated health information may contain errors. We recommend verifying important health information with a qualified professional.</p>
        
        <h2>6. Emergency Situations</h2>
        <p>If you are experiencing a medical emergency, call your local emergency number immediately. Do not rely on {BRAND_NAME} for emergency medical situations.</p>
        
        <h2>7. Modifications</h2>
        <p>We reserve the right to modify these terms at any time. Continued use after changes constitutes acceptance of the new terms.</p>
        
        <h2>8. Contact</h2>
        <p>For questions about these terms, contact us at support@secondopinion.health</p>
      </div>
    </div>
  );
}
