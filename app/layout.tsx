import "./styles.css";
import { ThemeProvider } from "next-themes";
import Header from "../components/Header";
import { ThemeMetaColor } from "../components/ThemeMetaColor";

export const metadata = { title: "MedX", description: "Global medical AI" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <ThemeMetaColor />
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
