import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import Sidebar from "../components/Sidebar";
import { CountryProvider } from "@/lib/country";
import { ContextProvider } from "@/lib/context";
import { TopicProvider } from "@/lib/topic";
import SignUpModal from "@/components/auth/SignUpModal";

export const metadata = { title: "MedX", description: "Global medical AI" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-gray-100">
        <SessionProvider>
          <CountryProvider>
            <ContextProvider>
              <TopicProvider>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                  <div className="flex">
                    <aside className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                      <Sidebar />
                    </aside>
                    <main className="flex-1 md:ml-64 min-h-dvh flex flex-col">
                      {children}
                    </main>
                  </div>
                  <SignUpModal forceOpen={!session} />
                </ThemeProvider>
              </TopicProvider>
            </ContextProvider>
          </CountryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
