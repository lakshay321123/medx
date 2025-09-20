import "./globals.css";
import { ThemeProvider } from "next-themes";
import { CountryProvider } from "@/lib/country";
import { ContextProvider } from "@/lib/context";
import { TopicProvider } from "@/lib/topic";
import { BRAND_NAME } from "@/lib/brand";
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
      <body className="min-h-screen bg-white dark:text-gray-100 text-slate-900 font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <CountryProvider>
            <ContextProvider>
              <TopicProvider>
                <div className="min-h-screen flex flex-col">
                  {children}
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
