"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Home", href: "/", enabled: true },
  { label: "Competition", href: "/competition", enabled: true },
  { label: "Rulesets", href: "/rulesets", enabled: true },
  { label: "Participants", href: "/participants", enabled: true },
  { label: "Qualification", href: "/qualification", enabled: false },
  { label: "Events & Teams", href: "/events", enabled: false },
  { label: "Elimination & Finals", href: "/brackets", enabled: false },
  { label: "Printouts", href: "/printouts", enabled: false },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-[#0d0f12] text-zinc-100">
      {/* Persistent Top Navigation Bar */}
      <header className="bg-[#14171d]/95 backdrop-blur border-b border-[#262b36] sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 h-13 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#e0a800] text-[#0d0f12] font-black text-xs tracking-tighter">
                NP
              </span>
              <span className="font-bold tracking-tight text-sm text-white">
                NockPoint
              </span>
            </Link>

            <nav className="flex items-center gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                if (!item.enabled) {
                  return (
                    <span
                      key={item.label}
                      title="Available in upcoming user stories"
                      className="px-3 py-1.5 text-xs font-medium text-zinc-600 cursor-not-allowed whitespace-nowrap"
                    >
                      {item.label}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? "bg-[#242933] text-white font-semibold border border-[#343b48]"
                        : "text-zinc-400 hover:bg-[#1c2028] hover:text-zinc-100 border border-transparent"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/api/health"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-[#1a1e26] border border-[#262b36] transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              PostgreSQL
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-6">
        {children}
      </div>

      {/* Compact Operational Footer */}
      <footer className="border-t border-[#20242d] bg-[#111419] text-[11px] text-zinc-500">
        <div className="max-w-[1440px] mx-auto px-4 py-2.5 flex items-center justify-between">
          <span>NockPoint • Archery Results Management System</span>
          <span className="font-mono">WA / ORIS Compatible • Multi-Class Engine</span>
        </div>
      </footer>
    </div>
  );
}
