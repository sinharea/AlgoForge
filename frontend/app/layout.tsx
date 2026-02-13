import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-[#0b1220] text-white">

        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[#0b1220]/60 border-b border-white/5">
  <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">

    <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
      AF
    </div>

    <div className="flex gap-8 text-gray-300">
      <a href="/" className="hover:text-white transition">Home</a>
      <a href="/problems" className="hover:text-white transition">Problems</a>
      <a href="/contests" className="hover:text-white transition">Contests</a>
      <a href="/leaderboard" className="hover:text-white transition">Leaderboard</a>
    </div>

  </div>
</nav>

        {/* Page Content */}
        <div className="pt-24 min-h-screen">
          {children}
        </div>

        {/* Footer Branding */}
        <div className="fixed bottom-6 right-8 text-right text-gray-400 text-sm leading-tight">
          <div>Built by</div>
          <div className="font-semibold text-blue-400 text-lg">
            Rea Sinha
          </div>
        </div>

      </body>
    </html>
  );
}
