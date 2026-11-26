import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          sessions: true,
          divisions: true,
          ageClasses: true,
          distanceRules: true,
        },
      },
    },
  });

  return (
    <div className="space-y-5">
      {/* Page Title Bar */}
      <div className="flex items-center justify-between border-b border-[#262b36] pb-4">
        <div>
          <h1 className="text-lg font-bold text-white">Tournament Control Center</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select an active competition or create a new tournament from a federation ruleset.
          </p>
        </div>
        <Link
          href="/competition"
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
        >
          + New Tournament
        </Link>
      </div>

      {/* Tournaments Table */}
      <section className="bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden">
        <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-2.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Tournaments ({tournaments.length})
          </h2>
          <Link href="/competition" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
            Open Competition Setup →
          </Link>
        </div>

        {tournaments.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            No tournaments configured yet.{" "}
            <Link href="/competition" className="text-blue-400 font-semibold hover:underline">
              Create your first tournament
            </Link>{" "}
            in Competition Setup.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#171b22] border-b border-[#262b36] text-zinc-400">
                  <th className="px-4 py-2.5 font-semibold">Code</th>
                  <th className="px-4 py-2.5 font-semibold">Competition Name</th>
                  <th className="px-4 py-2.5 font-semibold">Location</th>
                  <th className="px-4 py-2.5 font-semibold">Dates</th>
                  <th className="px-4 py-2.5 font-semibold">Ruleset</th>
                  <th className="px-4 py-2.5 font-semibold">Multi-Class Policy</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Config</th>
                  <th className="px-4 py-2.5 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222732]">
                {tournaments.map((t) => (
                  <tr key={t.id} className="hover:bg-[#1b2029] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-400">{t.code}</td>
                    <td className="px-4 py-3 font-medium text-zinc-100">
                      <Link href="/competition" className="hover:underline">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{t.location || "—"}</td>
                    <td className="px-4 py-3 text-zinc-400 tabular-nums whitespace-nowrap">
                      {t.startDate.toISOString().slice(0, 10)} → {t.endDate.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{t.ruleset}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/25">
                        {t.multiClassMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400 tabular-nums whitespace-nowrap">
                      {t._count.sessions} ses · {t._count.divisions} div · {t._count.ageClasses} cls ·{" "}
                      {t._count.distanceRules} dist
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.isLocked ? (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Locked
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Open
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Workflow Strip */}
      <section className="bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden">
        <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Tournament Workflow Modules
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#222732] text-xs">
          <div className="p-4">
            <div className="font-semibold text-white">1. Competition Setup</div>
            <p className="text-zinc-400 mt-1">Rulesets, sessions, divisions, age classes &amp; distances.</p>
            <Link href="/competition" className="inline-block mt-2.5 text-blue-400 font-medium hover:text-blue-300">
              Open →
            </Link>
          </div>
          <div className="p-4">
            <div className="font-semibold text-white">2. Participants &amp; Targets</div>
            <p className="text-zinc-400 mt-1">Archers, multi-class registration, TSV import &amp; auto-draw.</p>
            <Link href="/participants" className="inline-block mt-2.5 text-blue-400 font-medium hover:text-blue-300">
              Open →
            </Link>
          </div>
          <div className="p-4 opacity-50">
            <div className="font-semibold text-zinc-300">3. Qualification Scoring</div>
            <p className="text-zinc-500 mt-1">Score grids, arrow-by-arrow spotter &amp; category ranks.</p>
            <span className="inline-block mt-2.5 text-[11px] font-mono text-zinc-500">Epic 3</span>
          </div>
          <div className="p-4 opacity-50">
            <div className="font-semibold text-zinc-300">4. Events &amp; Matchplay</div>
            <p className="text-zinc-500 mt-1">Shoot-offs, teams, elimination brackets &amp; TV view.</p>
            <span className="inline-block mt-2.5 text-[11px] font-mono text-zinc-500">Epic 4–6</span>
          </div>
        </div>
      </section>
    </div>
  );
}
