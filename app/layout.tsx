import "./styles.css";
import { ThemeProvider } from "next-themes";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { ThemeMetaColor } from "../components/ThemeMetaColor";

export const metadata = { title: "MedX", description: "Global medical AI" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <ThemeMetaColor />
          <div className="flex">
            <aside className="hidden md:block fixed inset-y-0 left-0 w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <Sidebar />
            </aside>
            <main className="flex-1 md:ml-64">
              <Header />
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
