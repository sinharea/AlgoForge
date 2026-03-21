import "./globals.css";
import Link from "next/link";
import Providers from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <Providers>
          <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-xl font-bold text-violet-400">AlgoForge</Link>
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/problems">Problems</Link>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/contests">Contests</Link>
                <Link href="/auth/login">Login</Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
