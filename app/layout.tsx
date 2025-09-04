import "./globals.css";
import { ThemeProvider } from "next-themes";
import Sidebar from "../components/Sidebar";
import { CountryProvider } from "@/lib/country";
import { ContextProvider } from "@/lib/context";
import { TopicProvider } from "@/lib/topic";
import { Suspense } from "react";

export const metadata = { title: "MedX", description: "Global medical AI" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-gray-100">
        <CountryProvider>
          <ContextProvider>
            <TopicProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <div className="flex">
                  <Suspense fallback={null}>
                    <Sidebar />
                  </Suspense>
                  <main className="flex-1 md:ml-72 min-h-dvh flex flex-col relative z-0">
                    {children}
                  </main>
                </div>
              </ThemeProvider>
            </TopicProvider>
          </ContextProvider>
        </CountryProvider>
      </body>
    </html>
  );
}
