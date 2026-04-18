import "./globals.css";
import Providers from "./providers";
import Header from "@/src/components/layout/Header";
import { Lora, Playfair_Display } from "next/font/google";

const bodyFont = Lora({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata = {
  title: "AlgoForge - Master Algorithms with Industry-Grade Challenges",
  description: "Practice coding problems, compete in contests, and level up your skills with secure Docker-based execution.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${bodyFont.variable} ${headingFont.variable} min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased`}>
        <Providers>
          <Header />
          <main>{children}</main>
          <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p className="text-sm text-[var(--text-muted)]">
                  2024 AlgoForge. Built for developers.
                </p>
                <div className="flex gap-6 text-sm text-[var(--text-muted)]">
                  <a href="#" className="hover:text-[var(--text-primary)]">Terms</a>
                  <a href="#" className="hover:text-[var(--text-primary)]">Privacy</a>
                  <a href="#" className="hover:text-[var(--text-primary)]">GitHub</a>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
