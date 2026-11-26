"use client";

import { useState } from "react";
import { Shuffle, Eraser } from "lucide-react";

export interface TargetPanelSession {
  id: string;
  sessionNum: number;
  name: string;
  maxBales?: number;
  archersPerBale?: number;
}

export interface TargetPanelRow {
  id: string;
  divisionCode: string;
  primaryClassCode: string;
  baleNumber?: number | null;
  targetLetter?: string | null;
  targetNoFormatted: string | null;
  sessionId: string | null;
  status: string;
  archer: {
    bibCode: string;
    firstName: string;
    lastName: string;
  };
  club: {
    code: string;
    name: string;
  } | null;
  session: {
    id: string;
    sessionNum: number;
    name: string;
  } | null;
}

interface Props {
  tournamentId: string;
  isLocked: boolean;
  sessions: TargetPanelSession[];
  rows: TargetPanelRow[];
  onRefresh: () => Promise<void>;
}

export default function TargetDrawPanel({
  tournamentId,
  isLocked,
  sessions,
  rows,
  onRefresh,
}: Props) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id ?? "");
  const [startBale, setStartBale] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const activeSessionId = selectedSessionId || sessions[0]?.id || "";
  const sessionRows = rows.filter((r) => r.sessionId === activeSessionId);
  const unassignedRows = rows.filter((r) => !r.sessionId);

  // Group assigned rows by baleNumber
  const baleMap = new Map<number, TargetPanelRow[]>();
  const noTargetYet: TargetPanelRow[] = [];

  for (const r of sessionRows) {
    if (r.baleNumber && r.targetLetter) {
      const list = baleMap.get(r.baleNumber) ?? [];
      list.push(r);
      baleMap.set(r.baleNumber, list);
    } else {
      noTargetYet.push(r);
    }
  }

  const sortedBales = Array.from(baleMap.entries()).sort((a, b) => a[0] - b[0]);

  async function runDraw(action: "DRAW" | "CLEAR") {
    if (!activeSessionId) return;
    setBusy(true);
    setMessage(null);
    setWarnings([]);

    const res = await fetch("/api/targets/auto-draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentId,
        sessionId: activeSessionId,
        startBale,
        action,
      }),
    });

    const data = await res.json();
    setBusy(false);

    if (!res.ok) {
      setMessage(data.error || "Target draw failed");
      return;
    }

    if (action === "CLEAR") {
      setMessage(`Cleared target assignments for ${data.clearedCount} archer(s).`);
    } else {
      setMessage(
        `Assigned ${data.assignedCount} archer(s) across ${data.balesUsed} bale(s) with club separation.`
      );
      setWarnings(data.warnings ?? []);
    }

    await onRefresh();
  }

  async function handleMoveSession(regId: string, newSessionId: string) {
    await fetch(`/api/participants/${regId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: newSessionId || null }),
    });
    await onRefresh();
  }

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-[#14171d] border border-[#262b36] rounded-xl p-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Shooting Session</label>
            <select
              value={activeSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="bg-[#0d0f12] border border-[#2c3240] rounded-lg px-3 py-1.5 text-xs text-zinc-100"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  S{s.sessionNum}: {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">Start Bale #</label>
            <input
              type="number"
              min={1}
              value={startBale}
              onChange={(e) => setStartBale(Math.max(1, Number(e.target.value)))}
              className="w-20 bg-[#0d0f12] border border-[#2c3240] rounded-lg px-2.5 py-1.5 text-xs text-right tabular-nums"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy || isLocked || !activeSessionId}
            onClick={() => runDraw("CLEAR")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2c3240] bg-[#1a1e26] hover:bg-[#242933] text-xs font-medium text-zinc-300 disabled:opacity-40"
          >
            <Eraser className="w-3.5 h-3.5" /> Clear Session Targets
          </button>
          <button
            type="button"
            disabled={busy || isLocked || !activeSessionId}
            onClick={() => runDraw("DRAW")}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-40"
          >
            <Shuffle className="w-3.5 h-3.5" />
            {busy ? "Drawing..." : "Run Auto-Draw (Club Interleaved)"}
          </button>
        </div>
      </div>

      {message && (
        <div className="px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200 space-y-1">
          <div>{message}</div>
          {warnings.map((w, i) => (
            <div key={i} className="text-amber-300">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {/* Visual Bale Grid */}
      <section className="bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden">
        <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-2.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Assigned Bales ({sortedBales.length} bales · {sessionRows.length - noTargetYet.length} archers)
          </h2>
          {noTargetYet.length > 0 && (
            <span className="text-[11px] font-mono text-amber-300">
              {noTargetYet.length} archer(s) in this session awaiting target draw
            </span>
          )}
        </div>

        {sortedBales.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No targets assigned in this session yet. Click <strong>Run Auto-Draw</strong> above to assign bales.
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sortedBales.map(([baleNum, archers]) => {
              const sortedArchers = [...archers].sort((a, b) =>
                (a.targetLetter ?? "").localeCompare(b.targetLetter ?? "")
              );
              return (
                <div
                  key={baleNum}
                  className="bg-[#101318] border border-[#262b36] rounded-xl overflow-hidden"
                >
                  <div className="bg-[#1a1e26] border-b border-[#262b36] px-3 py-2 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white">
                      Bale {String(baleNum).padStart(3, "0")}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {sortedArchers[0]?.divisionCode}/{sortedArchers[0]?.primaryClassCode}
                    </span>
                  </div>
                  <div className="divide-y divide-[#1f242e]">
                    {sortedArchers.map((a) => (
                      <div key={a.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 shrink-0 rounded-md bg-blue-600/20 border border-blue-500/30 text-blue-300 font-mono font-bold text-[11px] flex items-center justify-center">
                            {a.targetLetter}
                          </span>
                          <div className="truncate">
                            <div className="font-medium text-zinc-100 truncate">
                              {a.archer.lastName.toUpperCase()}, {a.archer.firstName}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                              {a.targetNoFormatted} · {a.club?.code ?? "IND"}
                            </div>
                          </div>
                        </div>

                        <select
                          value={a.sessionId ?? ""}
                          disabled={isLocked}
                          onChange={(e) => handleMoveSession(a.id, e.target.value)}
                          title="Move archer to another session"
                          className="bg-[#14171d] border border-[#2c3240] rounded-md px-1.5 py-0.5 text-[10px] text-zinc-300"
                        >
                          {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              S{s.sessionNum}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Unassigned-to-any-session helper */}
      {unassignedRows.length > 0 && (
        <section className="bg-[#14171d] border border-amber-500/30 rounded-xl overflow-hidden">
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-300">
            Archers Without a Session ({unassignedRows.length}) — Assign a session to include them in Auto-Draw
          </div>
          <div className="divide-y divide-[#222732]">
            {unassignedRows.map((r) => (
              <div key={r.id} className="px-4 py-2 flex items-center justify-between text-xs">
                <span>
                  <strong className="font-mono text-blue-400 mr-2">{r.archer.bibCode}</strong>
                  {r.archer.lastName.toUpperCase()}, {r.archer.firstName} ({r.divisionCode}/{r.primaryClassCode})
                </span>
                <select
                  value=""
                  disabled={isLocked}
                  onChange={(e) => handleMoveSession(r.id, e.target.value)}
                  className="bg-[#0d0f12] border border-[#2c3240] rounded-lg px-2 py-1 text-xs"
                >
                  <option value="">Assign session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      S{s.sessionNum}: {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
