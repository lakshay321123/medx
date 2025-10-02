'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAidocStore } from '@/stores/useAidocStore';
import AidocReportViewer from '@/components/aidoc/ReportViewer';

const AIDOC_UI_ENABLED = process.env.NEXT_PUBLIC_AIDOC_UI !== '0';

export default function AiDocPane() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetForThread = useAidocStore(s => s.resetForThread);
  const structured = useAidocStore(s => s.structured);

  const threadId = searchParams.get('threadId');

  useEffect(() => {
    if (!threadId) {
      const saved = typeof window !== 'undefined' ? sessionStorage.getItem('aidoc_thread') : null;
      if (saved) {
        router.push(`?panel=ai-doc&threadId=${saved}&context=profile`);
      } else {
        const id = `aidoc_${Date.now().toString(36)}`;
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('aidoc_thread', id);
        }
        router.push(`?panel=ai-doc&threadId=${id}&context=profile`);
      }
    }
  }, [threadId, router]);

  useEffect(() => {
    if (!threadId) return;
    resetForThread(threadId);
  }, [threadId, resetForThread]);

  if (!AIDOC_UI_ENABLED) {
    return (
      <div className="flex min-h-full flex-col justify-center gap-4 p-4 text-center text-sm text-slate-500 dark:text-slate-300">
        <p>AI Doc reports are currently disabled.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4 p-4">
      <AidocReportViewer
        patient={structured.patient}
        reports={structured.reports}
        comparisons={structured.comparisons}
        summary={structured.summary}
        nextSteps={structured.nextSteps}
      />
    </div>
  );
}
