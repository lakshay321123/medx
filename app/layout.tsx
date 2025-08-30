import './styles.css';
import { ThemeProvider } from 'next-themes';
import { LocaleProvider } from '@/lib/locale';

export const metadata = { title: 'MedX', description: 'Global medical AI' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>
          <ThemeProvider attribute="class" defaultTheme="system">{children}</ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
