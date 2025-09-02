import './globals.css';
import { ThemeProvider } from 'next-themes';

export const metadata = { title: 'MedX', description: 'Global medical AI' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-slate-900 dark:bg-slate-950 dark:text-gray-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>{children}</ThemeProvider>
      </body>
    </html>
  );
}
