import "./globals.css";
import { ThemeProvider } from "next-themes";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { CountryProvider } from "@/lib/country";
import { ContextProvider } from "@/lib/context";
import { TopicProvider } from "@/lib/topic";
import { BRAND_NAME } from "@/lib/brand";
import { Suspense } from "react";
import MemorySnackbar from "@/components/memory/Snackbar";
import UndoToast from "@/components/memory/UndoToast";
import { Roboto } from "next/font/google";

export const metadata = { title: BRAND_NAME, description: "Global medical AI" };

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body className="h-full bg-slate-100 text-slate-900 dark:bg-transparent dark:text-slate-100 font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <CountryProvider>
            <ContextProvider>
              <TopicProvider>
                <div className="flex h-full min-h-screen flex-col medx-gradient">
                  <Suspense fallback={<div className="h-[62px]" />}>
                    <Header />
                  </Suspense>
                  <div className="grid grow min-h-0 grid-cols-12">
                    <aside className="hidden min-h-0 overflow-y-auto border-r border-black/5 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40 md:col-span-3 md:flex lg:col-span-2">
                      <Suspense fallback={null}>
                        <Sidebar />
                      </Suspense>
                    </aside>
                    <main className="col-span-12 flex min-h-0 md:col-span-9 lg:col-span-10">
                      <div className="flex flex-1 min-h-0 flex-col">
                        <Suspense fallback={<div className="flex-1 min-h-0" />}>
                          {children}
                        </Suspense>
                      </div>
                    </main>
                  </div>
                  <MemorySnackbar />
                  <UndoToast />
                </div>
              </TopicProvider>
            </ContextProvider>
          </CountryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
