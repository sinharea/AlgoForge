"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Shield, LayoutDashboard, BookOpen, Trophy, Users, Flag, BarChart3 } from "lucide-react";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/problems", label: "Problems", icon: BookOpen },
  { href: "/admin/contests", label: "Contests", icon: Trophy },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready } = useProtectedRoute(["admin"]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="card h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-300">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-sm text-[var(--text-secondary)]">AlgoForge platform operations and moderation</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--accent-primary)]/15 text-[var(--accent-secondary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section>{children}</section>
      </div>
    </div>
  );
}
