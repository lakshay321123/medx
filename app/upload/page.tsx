import UploadPanel from '@/components/UploadPanel';

export const dynamic = 'force-dynamic';

export default function UploadPage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>Upload a medical document (PDF)</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        We’ll extract text, auto-detect if it’s a prescription or a lab/blood report, and summarize it.
      </p>
      <UploadPanel />
    </main>
  );
}
