import { BRAND_NAME } from "@/lib/brand";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold mb-6">{BRAND_NAME} — Privacy Policy</h1>
      <div className="prose prose-slate dark:prose-invert prose-medx text-[15px] leading-[1.7]">
        <p>Last updated: March 23, 2026</p>
        
        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly: name, date of birth, sex, medical conditions, lab results, and health queries. We also collect usage data (pages visited, features used) to improve the service.</p>
        
        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide personalized health information and guidance</li>
          <li>To compute health scores and risk assessments</li>
          <li>To improve our AI models and service quality</li>
          <li>To send important health alerts and reminders (if opted in)</li>
        </ul>
        
        <h2>3. Data Storage and Security</h2>
        <p>Your data is stored in secure, encrypted databases (Supabase with Row Level Security). We use industry-standard security measures to protect your information.</p>
        
        <h2>4. Third-Party Services</h2>
        <p>We use the following third-party services to provide our platform:</p>
        <ul>
          <li>OpenAI — for AI-powered health analysis (your queries are processed by their API)</li>
          <li>Supabase — for secure data storage</li>
          <li>Vercel — for hosting</li>
          <li>Google Custom Search — for web research (queries only, no personal data)</li>
          <li>EuropePMC — for medical research citations (queries only)</li>
        </ul>
        
        <h2>5. Data Retention</h2>
        <p>We retain your data as long as your account is active. You can request deletion of your data at any time by contacting us.</p>
        
        <h2>6. Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data. You can export your health data at any time from the Medical Profile section.</p>
        
        <h2>7. Children</h2>
        <p>{BRAND_NAME} is not intended for use by individuals under 13 years of age.</p>
        
        <h2>8. Contact</h2>
        <p>For privacy inquiries, contact us at privacy@secondopinion.health</p>
      </div>
    </div>
  );
}
