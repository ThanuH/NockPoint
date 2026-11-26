"use client";

import { useState } from "react";
import { Search, CheckCircle2, Circle, ShieldCheck } from "lucide-react";

export interface AccreditationRow {
  id: string;
  divisionCode: string;
  primaryClassCode: string;
  targetNoFormatted: string | null;
  status: string;
  feePaid: boolean;
  parentalApprovalReceived: boolean;
  checkedInAt?: string | null;
  equipmentInspectedAt?: string | null;
  archer: {
    bibCode: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
  };
  club: {
    code: string;
    name: string;
  } | null;
}

interface Props {
  isLocked: boolean;
  rows: AccreditationRow[];
  onRefresh: () => Promise<void>;
}

export default function AccreditationPanel({ isLocked, rows, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const total = rows.length;
  const checkedInCount = rows.filter((r) => Boolean(r.checkedInAt)).length;
  const equipCount = rows.filter((r) => Boolean(r.equipmentInspectedAt)).length;
  const feeCount = rows.filter((r) => r.feePaid).length;

  async function toggleField(id: string, payload: Record<string, boolean>) {
    setUpdatingId(id);
    await fetch(`/api/participants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setUpdatingId(null);
    await onRefresh();
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.archer.bibCode.toLowerCase().includes(q) ||
      `${r.archer.firstName} ${r.archer.lastName}`.toLowerCase().includes(q) ||
      (r.club?.code ?? "").toLowerCase().includes(q) ||
      (r.targetNoFormatted ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Live Accreditation Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#14171d] border border-[#262b36] rounded-xl p-3.5">
          <div className="text-[11px] text-zinc-400">Registered Slots</div>
          <div className="text-xl font-bold text-white tabular-nums mt-0.5">{total}</div>
        </div>
        <div className="bg-[#14171d] border border-[#262b36] rounded-xl p-3.5">
          <div className="text-[11px] text-zinc-400">Checked In</div>
          <div className="text-xl font-bold text-emerald-400 tabular-nums mt-0.5">
            {checkedInCount} <span className="text-xs font-normal text-zinc-500">/ {total}</span>
          </div>
        </div>
        <div className="bg-[#14171d] border border-[#262b36] rounded-xl p-3.5">
          <div className="text-[11px] text-zinc-400">Equipment Inspected</div>
          <div className="text-xl font-bold text-blue-400 tabular-nums mt-0.5">
            {equipCount} <span className="text-xs font-normal text-zinc-500">/ {total}</span>
          </div>
        </div>
        <div className="bg-[#14171d] border border-[#262b36] rounded-xl p-3.5">
          <div className="text-[11px] text-zinc-400">Entry Fees Paid</div>
          <div className="text-xl font-bold text-amber-400 tabular-nums mt-0.5">
            {feeCount} <span className="text-xs font-normal text-zinc-500">/ {total}</span>
          </div>
        </div>
      </div>

      {/* Check-In Desk Table */}
      <section className="bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden">
        <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Accreditation, Equipment Inspection &amp; Payment Desk
          </h2>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Scan/type Bib, Name, Target..."
              className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg pl-8 pr-3 py-1 text-xs"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">No matching participants.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#171b22] border-b border-[#262b36] text-zinc-400">
                  <th className="px-3.5 py-2.5 font-semibold">Target</th>
                  <th className="px-3.5 py-2.5 font-semibold">Bib</th>
                  <th className="px-3.5 py-2.5 font-semibold">Athlete</th>
                  <th className="px-3.5 py-2.5 font-semibold">Club / Cat</th>
                  <th className="px-3.5 py-2.5 font-semibold text-center">Checked In</th>
                  <th className="px-3.5 py-2.5 font-semibold text-center">Equipment OK</th>
                  <th className="px-3.5 py-2.5 font-semibold text-center">Fee Paid</th>
                  <th className="px-3.5 py-2.5 font-semibold text-center">Parental Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222732]">
                {filtered.map((row) => {
                  const isCheckedIn = Boolean(row.checkedInAt);
                  const isEquipOk = Boolean(row.equipmentInspectedAt);
                  const busy = updatingId === row.id;

                  return (
                    <tr key={row.id} className="hover:bg-[#1b2029]">
                      <td className="px-3.5 py-2.5 font-mono text-zinc-400">
                        {row.targetNoFormatted || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-blue-400 font-semibold">
                        {row.archer.bibCode}
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-zinc-100">
                        {row.archer.lastName.toUpperCase()}, {row.archer.firstName}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-zinc-400">
                        {row.club?.code ?? "IND"} · {row.divisionCode}/{row.primaryClassCode}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          type="button"
                          disabled={isLocked || busy}
                          onClick={() => toggleField(row.id, { checkedIn: !isCheckedIn })}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                            isCheckedIn
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-[#0d0f12] text-zinc-500 border-[#262b36] hover:text-zinc-200"
                          }`}
                        >
                          {isCheckedIn ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                          {isCheckedIn ? "In" : "Pending"}
                        </button>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          type="button"
                          disabled={isLocked || busy}
                          onClick={() => toggleField(row.id, { equipmentInspected: !isEquipOk })}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                            isEquipOk
                              ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                              : "bg-[#0d0f12] text-zinc-500 border-[#262b36] hover:text-zinc-200"
                          }`}
                        >
                          {isEquipOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                          {isEquipOk ? "Passed" : "Pending"}
                        </button>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          type="button"
                          disabled={isLocked || busy}
                          onClick={() => toggleField(row.id, { feePaid: !row.feePaid })}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                            row.feePaid
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-[#0d0f12] text-zinc-500 border-[#262b36] hover:text-zinc-200"
                          }`}
                        >
                          {row.feePaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                          {row.feePaid ? "Paid" : "Unpaid"}
                        </button>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          type="button"
                          disabled={isLocked || busy}
                          onClick={() =>
                            toggleField(row.id, {
                              parentalApprovalReceived: !row.parentalApprovalReceived,
                            })
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                            row.parentalApprovalReceived
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-[#0d0f12] text-zinc-500 border-[#262b36] hover:text-zinc-200"
                          }`}
                        >
                          {row.parentalApprovalReceived ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Circle className="w-3.5 h-3.5" />
                          )}
                          {row.parentalApprovalReceived ? "Signed" : "—"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
