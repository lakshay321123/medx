'use client';
import { useSearchParams, useRouter } from 'next/navigation';

const tabs = [
  { key: 'chat', label: 'Chat' },
  { key: 'profile', label: 'Medical Profile' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'settings', label: 'Settings' },
];

export default function Tabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('panel') ?? 'chat';

  const onSelect = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('panel', key);
    router.push('?' + params.toString());
  };

  return (
    <ul className="mt-3 space-y-1">
      {tabs.map(t => (
        <li key={t.key}>
          <button
            onClick={() => onSelect(t.key)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-slate-100 dark:hover:bg-gray-800 ${current === t.key ? 'bg-slate-100 dark:bg-gray-800 font-medium' : ''}`}
          >
            {t.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
