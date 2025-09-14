import "./globals.css";
import { ThemeProvider } from "next-themes";
import Sidebar from "../components/Sidebar";
import { CountryProvider } from "@/lib/country";
import { ContextProvider } from "@/lib/context";
import { TopicProvider } from "@/lib/topic";
import { Suspense } from "react";
import MemorySnackbar from "@/components/memory/Snackbar";
import UndoToast from "@/components/memory/UndoToast";
import { Roboto } from "next/font/google";

export const metadata = { title: "MedX", description: "Global medical AI" };

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-gray-100 font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CountryProvider>
            <ContextProvider>
              <TopicProvider>
                <div className="flex medx-gradient">
                  <Suspense fallback={null}>
                    <Sidebar />
                  </Suspense>
                  <main className="flex-1 md:ml-64 min-h-dvh flex flex-col relative z-0">
                    {children}
                    <MemorySnackbar />
                    <UndoToast />
                  </main>
                </div>
              </TopicProvider>
            </ContextProvider>
          </CountryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
