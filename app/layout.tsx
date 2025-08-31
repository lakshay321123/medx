import './styles.css';
import { ThemeProvider } from 'next-themes';
import type { Metadata } from 'next';
import './globals.css';
import SafeJsonPolyfill from './_safe-json-polyfill';

export const metadata = { title: 'MedX', description: 'Global medical AI' };
export const metadata: Metadata = {
  title: 'MedX',
  description: 'Global medical companion',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
return (
<html lang="en">
<body>
        <ThemeProvider attribute="class" defaultTheme="system">{children}</ThemeProvider>
        {/* Install the global safe JSON patch BEFORE anything else renders */}
        <SafeJsonPolyfill />
        {children}
</body>
</html>
);
