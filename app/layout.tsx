import "./globals.css";
import { ThemeProvider } from "next-themes";
import Sidebar from "../components/Sidebar";
import { CountryProvider } from "@/lib/country";
import { ContextProvider } from "@/lib/context";

export const metadata = { title: "MedX", description: "Global medical AI" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-gray-100">
        <CountryProvider>
          <ContextProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <div className="flex">
                <aside className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <Sidebar />
                </aside>
                <main className="flex-1 md:ml-64 min-h-dvh flex flex-col">
                  {children}
                </main>
              </div>
            </ThemeProvider>
          </ContextProvider>
        </CountryProvider>
      </body>
    </html>
  );
}
