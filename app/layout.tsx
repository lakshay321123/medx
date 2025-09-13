import "@/styles/globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata = { title: "MedX", description: "Global medical AI" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `
    try {
      const t = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', t ? t === 'dark' : prefersDark);
    } catch {}
  `;
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <div className="flex">
          <Sidebar />
          <div className="flex flex-1 flex-col">
            <Header />
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
