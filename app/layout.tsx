import "./globals.css";
import { ThemeProvider } from "next-themes";
import Sidebar from "@/components/Sidebar/Sidebar";
import { CountryProvider } from "@/lib/country";
import { ContextProvider } from "@/lib/context";
import { TopicProvider } from "@/lib/topic";
import { ChatStateProvider } from "@/context/ChatStateProvider";

export const metadata = { title: "MedX", description: "Global medical AI" } as const;
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-gray-100">
        <CountryProvider>
          <ContextProvider>
            <TopicProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <ChatStateProvider>
                  <div className="grid grid-cols-[280px_1fr] h-screen">
                    <aside className="border-r">
                      <Sidebar />
                    </aside>
                    <main className="overflow-auto">{children}</main>
                  </div>
                </ChatStateProvider>
              </ThemeProvider>
            </TopicProvider>
          </ContextProvider>
        </CountryProvider>
      </body>
    </html>
  );
}
