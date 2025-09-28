// app/layout.tsx
import "./globals.css";
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
import Script from "next/script";
import I18nProvider from "@/components/providers/I18nProvider";

// Mobile-only UI (loaded client-side)
const MobileHeader = dynamic(() => import("@/components/mobile/MobileHeader"), { ssr: false });
const MobileSidebarOverlay = dynamic(() => import("@/components/mobile/MobileSidebarOverlay"), { ssr: false });
const MobileActionsSheet = dynamic(() => import("@/components/mobile/MobileActionsSheet"), { ssr: false });

export const metadata = { title: BRAND_NAME, description: "Global medical AI" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://fonts.cdnfonts.com" />
        <link rel="preconnect" href="https://fonts.cdnfonts.com" crossOrigin="anonymous" />
        {/* Keep this ONLY if you still rely on the CDN font.
           If you've migrated to a local/next-font, remove this link. */}
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/proxima-nova-2"
        />
        <noscript>
          <style>{"body.font-loading{opacity:1 !important}"}</style>
        </noscript>
      </head>
      <body className="font-loading h-full bg-slate-100 text-slate-900 dark:bg-transparent dark:text-slate-100 font-sans antialiased">
        <I18nProvider>
          <Script id="ensure-proxima-first" strategy="beforeInteractive">
            {`
            (function() {
              var className = "font-loading";
              var removeClass = function() {
                var body = document.body;
                if (!body || !body.classList.contains(className)) return;
                body.classList.remove(className);
                try {
                  window.sessionStorage.setItem("proxima-font-loaded", "1");
                } catch (e) {
                  // ignore
                }
              };

              try {
                if (window.sessionStorage.getItem("proxima-font-loaded")) {
                  removeClass();
                  return;
                }
              } catch (e) {
                // ignore
              }

              if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(removeClass);
                if (document.fonts.status === "loaded") {
                  removeClass();
                }
              } else {
                window.addEventListener("load", removeClass, { once: true });
              }
            })();
          `}
          </Script>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <CountryProvider>
              <ContextProvider>
                <TopicProvider>
                  <div className="flex h-full min-h-screen flex-col medx-gradient">
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
                    <aside className="hidden min-h-0 overflow-y-auto border-r border-black/5 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40 md:col-span-3 md:flex lg:col-span-2">
                      <Suspense fallback={null}>
                        <Sidebar />
                      </Suspense>
                    </aside>

                    {/* Main Content */}
                    <main className="col-span-12 flex min-h-0 md:col-span-9 lg:col-span-10">
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
        </I18nProvider>
      </body>
    </html>
  );
}
