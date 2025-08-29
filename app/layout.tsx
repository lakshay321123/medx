import './styles.css';
import { ThemeProvider } from 'next-themes';

export const metadata = { title: 'MedX', description: 'Global medical AI' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="system">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
