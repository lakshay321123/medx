// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
import { ThemeProvider } from "next-themes";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import LegalPrivacyFooter from "@/components/LegalPrivacyFooter";
import { CountryProvider } from "@/lib/country";
import { ContextProvider } from "@/lib/context";
import { TopicProvider } from "@/lib/topic";
import { BRAND_NAME } from "@/lib/brand";
import { Suspense } from "react";
import MemorySnackbar from "@/components/memory/Snackbar";
import UndoToast from "@/components/memory/UndoToast";
import AppToastHost from "@/components/ui/AppToastHost";
import dynamic from "next/dynamic";
import PreferencesProvider from "@/components/providers/PreferencesProvider";
import LangDirEffect from "@/components/providers/LangDirEffect";

// Mobile-only UI (loaded client-side)
const MobileHeader = dynamic(() => import("@/components/mobile/MobileHeader"), { ssr: false });
const MobileSidebarOverlay = dynamic(() => import("@/components/mobile/MobileSidebarOverlay"), { ssr: false });
const MobileActionsSheet = dynamic(() => import("@/components/mobile/MobileActionsSheet"), { ssr: false });

export const metadata = { title: BRAND_NAME, description: "Global medical AI" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://api.openai.com" />
        <link rel="preconnect" href="https://api.openai.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.groq.com" />
        <link rel="preconnect" href="https://api.groq.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

      </head>
      <body className={`${inter.variable} h-full font-sans antialiased bg-[var(--so-bg,#fff)] text-[var(--so-text,#000)]`}>

        <PreferencesProvider>
          <LangDirEffect />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <CountryProvider>
              <ContextProvider>
                <TopicProvider>
                  <div className="flex h-full min-h-screen flex-col">
                    {/* Desktop Header */}
                    <Suspense fallback={<div className="h-[62px]" />}>
                      <div className="hidden md:block">
                        <Header />
                      </div>
                    </Suspense>

                    {/* Mobile Header (always rendered; CSS shows it only on mobile) */}
                    <MobileHeader />

                    <div className="grid grow min-h-0 grid-cols-12 mobile-content-offset md:pt-0">
                      {/* Desktop Sidebar */}
                      <aside className="hidden min-h-0 overflow-y-auto border-r border-[var(--so-border,#E5E5EA)] md:col-span-3 md:flex lg:col-span-2 bg-[#F9F9F9] dark:bg-[#1C1C1E] dark:border-[#2C2C2E]">
                        <Suspense fallback={null}>
                          <Sidebar />
                        </Suspense>
                      </aside>

                      {/* Main Content */}
                      <main className="col-span-12 flex min-h-0 overflow-y-auto md:col-span-9 lg:col-span-10">
                        <div className="flex flex-1 min-h-0 flex-col">
                          <Suspense fallback={<div className="flex-1 min-h-0" />}>
                            {children}
                          </Suspense>
                        </div>
                      </main>
                    </div>

                    {/* Fixed Legal & Privacy footer (mobile-aware) */}
                    <LegalPrivacyFooter />

                    {/* App Toasts */}
                    <MemorySnackbar />
                    <UndoToast />
                    <AppToastHost />

                    {/* Mobile overlays/sheets (client side) */}
                    <MobileSidebarOverlay />
                    <MobileActionsSheet />
                  </div>
                </TopicProvider>
              </ContextProvider>
            </CountryProvider>
          </ThemeProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
