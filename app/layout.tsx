import type { Metadata } from 'next';
import './globals.css';
import SafeJsonPolyfill from './_safe-json-polyfill';

export const metadata: Metadata = {
  title: 'MedX',
  description: 'Global medical companion',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* Install the global safe JSON patch BEFORE anything else renders */}
        <SafeJsonPolyfill />
        {children}
      </body>
    </html>
  );
}
