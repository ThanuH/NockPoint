"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Search, X, Layers, CheckCircle2, Circle, Upload, Download } from "lucide-react";
import TargetDrawPanel from "@/components/TargetDrawPanel";
import AccreditationPanel from "@/components/AccreditationPanel";

interface TournamentOption {
  id: string;
  code: string;
  name: string;
  multiClassMode: string;
  isLocked: boolean;
  sessions: { id: string; sessionNum: number; name: string; stage: string }[];
  divisions: { id: string; code: string; name: string }[];
  ageClasses: { id: string; code: string; name: string; gender: string; validShootUpClasses: string[] }[];
}

interface ParticipantRow {
  id: string;
  divisionCode: string;
  primaryClassCode: string;
  baleNumber: number | null;
  targetLetter: string | null;
  targetNoFormatted: string | null;
  status: string;
  feePaid: boolean;
  parentalApprovalReceived: boolean;
  checkedInAt: string | null;
  equipmentInspectedAt: string | null;
  bowSharingGroup: string | null;
  sessionId: string | null;
  archer: {
    id: string;
    bibCode: string;
    firstName: string;
    lastName: string;
    gender: string;
    birthDate: string | null;
  };
  club: {
    id: string;
    code: string;
    name: string;
  } | null;
  session: {
    id: string;
    sessionNum: number;
    name: string;
  } | null;
  categories: {
    id: string;
    divisionCode: string;
    classCode: string;
    isPrimary: boolean;
  }[];
}

const STATUS_CYCLE = ["ACTIVE", "DNS", "DNF", "DSQ", "WITHDRAWN"];

export default function ParticipantsPage() {
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"register" | "targets" | "accreditation">("register");
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick-entry keyboard form
  const bibInputRef = useRef<HTMLInputElement>(null);
  const [bibCode, setBibCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("M");
  const [birthDate, setBirthDate] = useState("");
  const [clubCode, setClubCode] = useState("COL");
  const [clubName, setClubName] = useState("Colombo Archery Club");
  const [divisionCode, setDivisionCode] = useState("");
  const [primaryClassCode, setPrimaryClassCode] = useState("");
  const [sessionId, setSessionId] = useState("");

  // Multi-Category Drawer state
  const [drawerRow, setDrawerRow] = useState<ParticipantRow | null>(null);
  const [mcMode, setMcMode] = useState<"SHARED_SCORE" | "NEW_SLOT">("SHARED_SCORE");
  const [mcDivision, setMcDivision] = useState("");
  const [mcClass, setMcClass] = useState("");
  const [mcSessionId, setMcSessionId] = useState("");
  const [mcError, setMcError] = useState<string | null>(null);
  const [mcSuggestedMode, setMcSuggestedMode] = useState<"SHARED_SCORE" | "SEPARATE_SESSIONS" | null>(null);
  const [mcSaving, setMcSaving] = useState(false);

  // Import Wizard state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFormat, setImportFormat] = useState<"AUTO" | "IANSEO_TSV" | "EVENTBOOKING_CSV" | "COGNITO_CSV" | "NOCKPOINT_CSV">("AUTO");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<{
    formatDetected?: string;
    importedCount?: number;
    skippedCount?: number;
    warnings?: string[];
    errors?: string[];
    error?: string;
  } | null>(null);

  const activeTournament = tournaments.find((t) => t.id === selectedTournamentId) ?? null;

  async function loadTournaments() {
    setLoading(true);
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json();
      if (Array.isArray(data)) {
        setTournaments(data);
        if (data.length > 0 && !selectedTournamentId) {
          setSelectedTournamentId(data[0].id);
        } else if (data.length === 0) {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  async function loadParticipants(tId: string) {
    if (!tId) return;
    setLoading(true);
    const res = await fetch(`/api/participants?tournamentId=${encodeURIComponent(tId)}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      setRows(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (!activeTournament) return;
    setDivisionCode(activeTournament.divisions[0]?.code ?? "");
    setPrimaryClassCode(activeTournament.ageClasses[0]?.code ?? "");
    setSessionId(activeTournament.sessions[0]?.id ?? "");
    loadParticipants(activeTournament.id);
  }, [selectedTournamentId, tournaments.length]);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTournament) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentId: activeTournament.id,
        bibCode,
        firstName,
        lastName,
        gender,
        birthDate: birthDate || null,
        clubCode,
        clubName,
        divisionCode,
        primaryClassCode,
        sessionId: sessionId || null,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || "Failed to register archer");
      return;
    }

    // Clear athlete-specific fields, keep club/division/session for rapid walk-in entry
    setBibCode("");
    setFirstName("");
    setLastName("");
    setBirthDate("");
    await loadParticipants(activeTournament.id);
    bibInputRef.current?.focus();
  }

  async function handleCycleStatus(row: ParticipantRow) {
    const nextIdx = (STATUS_CYCLE.indexOf(row.status) + 1) % STATUS_CYCLE.length;
    await fetch(`/api/participants/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: STATUS_CYCLE[nextIdx] }),
    });
    if (activeTournament) await loadParticipants(activeTournament.id);
  }

  async function handleToggleFee(row: ParticipantRow) {
    await fetch(`/api/participants/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feePaid: !row.feePaid }),
    });
    if (activeTournament) await loadParticipants(activeTournament.id);
  }

  async function handleDeleteOne(row: ParticipantRow) {
    if (!confirm(`Remove ${row.archer.firstName} ${row.archer.lastName} (${row.divisionCode}/${row.primaryClassCode})?`)) {
      return;
    }
    const res = await fetch(`/api/participants/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error);
      return;
    }
    if (activeTournament) await loadParticipants(activeTournament.id);
  }

  async function handleDeleteAll() {
    if (!activeTournament) return;
    if (!confirm(`Delete ALL ${rows.length} participant registrations in "${activeTournament.name}"?`)) return;
    const res = await fetch(`/api/participants?tournamentId=${encodeURIComponent(activeTournament.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error);
      return;
    }
    await loadParticipants(activeTournament.id);
  }

  function openMultiClassDrawer(row: ParticipantRow) {
    setDrawerRow(row);
    setMcError(null);
    setMcSuggestedMode(null);
    setMcMode("SHARED_SCORE");
    setMcDivision(row.divisionCode);
    const otherClass =
      activeTournament?.ageClasses.find(
        (c) => c.code !== row.primaryClassCode && (c.gender === row.archer.gender || c.gender === "X")
      )?.code ?? row.primaryClassCode;
    setMcClass(otherClass);
    const otherSession = activeTournament?.sessions.find((s) => s.id !== row.sessionId)?.id ?? "";
    setMcSessionId(otherSession);
  }

  async function handleAddMultiClass(e: React.FormEvent) {
    e.preventDefault();
    if (!drawerRow || !activeTournament) return;
    setMcSaving(true);
    setMcError(null);
    setMcSuggestedMode(null);

    const res = await fetch(`/api/participants/${drawerRow.id}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: mcMode,
        divisionCode: mcDivision,
        classCode: mcClass,
        sessionId: mcMode === "NEW_SLOT" ? mcSessionId || null : null,
      }),
    });

    const data = await res.json();
    setMcSaving(false);

    if (!res.ok) {
      setMcError(data.error || "Failed to add category");
      if (data.suggestedMode) setMcSuggestedMode(data.suggestedMode);
      return;
    }

    setDrawerRow(null);
    await loadParticipants(activeTournament.id);
  }

  async function handleRemoveCategory(regId: string, catId: string) {
    const res = await fetch(`/api/participants/${regId}/categories?categoryId=${encodeURIComponent(catId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error);
      return;
    }
    if (activeTournament) await loadParticipants(activeTournament.id);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    setImportReport(null);
  }

  async function handleRunImport(e: React.FormEvent) {
    e.preventDefault();
    if (!activeTournament || !importText.trim()) return;
    setImporting(true);
    setImportReport(null);

    const res = await fetch("/api/participants/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentId: activeTournament.id,
        content: importText,
        format: importFormat,
      }),
    });

    const data = await res.json();
    setImporting(false);
    setImportReport(data);

    if (res.ok && data.importedCount > 0) {
      await loadParticipants(activeTournament.id);
    }
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.archer.bibCode.toLowerCase().includes(q) ||
      `${r.archer.firstName} ${r.archer.lastName}`.toLowerCase().includes(q) ||
      (r.club?.code ?? "").toLowerCase().includes(q) ||
      (r.club?.name ?? "").toLowerCase().includes(q) ||
      r.primaryClassCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header & Tournament Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262b36] pb-4">
        <div>
          <h1 className="text-lg font-bold text-white">Participants &amp; Multi-Class Registration Desk</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tab through the quick-entry bar and press Enter to register archers, then attach secondary age classes in 2 clicks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tournaments.length > 0 ? (
            <>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="bg-[#14171d] border border-[#2c3240] rounded-lg px-3 py-1.5 text-xs text-zinc-100"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.code}] {t.name} ({t.multiClassMode})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setShowImportModal(true);
                  setImportReport(null);
                }}
                disabled={activeTournament?.isLocked}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2c3240] bg-[#1a1e26] hover:bg-[#242933] text-xs font-medium text-zinc-200 disabled:opacity-40"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                Import TSV / CSV
              </button>
            </>
          ) : (
            <Link
              href="/competition"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Create Tournament First
            </Link>
          )}

          {rows.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={activeTournament?.isLocked}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-300 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All ({rows.length})
            </button>
          )}
        </div>
      </div>

      {/* No Tournament Empty State */}
      {!loading && tournaments.length === 0 && (
        <div className="bg-[#14171d] border border-[#262b36] rounded-xl p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-zinc-200">No tournaments configured yet</p>
          <p className="text-xs text-zinc-400">
            Create a tournament in Competition Setup (e.g., Sri Lanka Senior Nationals or WA 720) before registering archers.
          </p>
          <Link
            href="/competition"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Go to Competition Setup →
          </Link>
        </div>
      )}

      {/* Epic 2 Sub-Navigation Tabs */}
      {activeTournament && (
        <div className="flex items-center gap-1.5 border-b border-[#262b36] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "register"
                ? "bg-[#242933] text-white border border-[#343b48]"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1e26] border border-transparent"
            }`}
          >
            Registration Desk ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("targets")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "targets"
                ? "bg-[#242933] text-white border border-[#343b48]"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1e26] border border-transparent"
            }`}
          >
            Target Auto-Draw &amp; Bales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("accreditation")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "accreditation"
                ? "bg-[#242933] text-white border border-[#343b48]"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1e26] border border-transparent"
            }`}
          >
            Accreditation &amp; Check-In
          </button>
        </div>
      )}

      {/* Target Draw Tab */}
      {activeTournament && activeTab === "targets" && (
        <TargetDrawPanel
          tournamentId={activeTournament.id}
          isLocked={activeTournament.isLocked}
          sessions={activeTournament.sessions}
          rows={rows}
          onRefresh={() => loadParticipants(activeTournament.id)}
        />
      )}

      {/* Accreditation Check-In Tab */}
      {activeTournament && activeTab === "accreditation" && (
        <AccreditationPanel
          isLocked={activeTournament.isLocked}
          rows={rows}
          onRefresh={() => loadParticipants(activeTournament.id)}
        />
      )}

      {/* Keyboard-First Quick-Entry Bar */}
      {activeTournament && activeTab === "register" && (
        <form
          onSubmit={handleQuickAdd}
          className="bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden"
        >
          <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">
              Quick-Entry Bar <span className="text-zinc-500 font-normal ml-1">(Tab → Enter)</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/25">
              Policy: {activeTournament.multiClassMode}
            </span>
          </div>

          <div className="p-3.5 space-y-3">
            {error && (
              <div className="px-3 py-2 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-11 gap-2 items-end">
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Bib / ID</label>
                <input
                  ref={bibInputRef}
                  value={bibCode}
                  onChange={(e) => setBibCode(e.target.value)}
                  placeholder="Auto"
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">First Name *</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Kasun"
                  required
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Last Name *</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Perera"
                  required
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-2 py-1.5 text-xs"
                >
                  <option value="M">M</option>
                  <option value="W">W</option>
                  <option value="X">X</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Birth Date</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Club Code</label>
                <input
                  value={clubCode}
                  onChange={(e) => setClubCode(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Division</label>
                <select
                  value={divisionCode}
                  onChange={(e) => setDivisionCode(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-2 py-1.5 text-xs font-mono"
                >
                  {activeTournament.divisions.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1">Age Class</label>
                <select
                  value={primaryClassCode}
                  onChange={(e) => setPrimaryClassCode(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-2 py-1.5 text-xs font-mono"
                >
                  {activeTournament.ageClasses.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={submitting || activeTournament.isLocked}
                  className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">Club Name:</span>
                <input
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  className="w-52 bg-[#0d0f12] border border-[#2c3240] rounded-lg px-2.5 py-1 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">Session:</span>
                <select
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="bg-[#0d0f12] border border-[#2c3240] rounded-lg px-2.5 py-1 text-xs"
                >
                  <option value="">Unassigned</option>
                  {activeTournament.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      S{s.sessionNum}: {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Participant Grid */}
      {activeTournament && activeTab === "register" && (
      <section className="bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden">
        <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Registered Shooting Slots ({filtered.length})
          </h2>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, bib, club, class..."
              className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg pl-8 pr-3 py-1 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading participants...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No participants registered yet. Use the Quick-Entry Bar above to add your first archer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#171b22] border-b border-[#262b36] text-zinc-400">
                  <th className="px-3.5 py-2.5 font-semibold">Target</th>
                  <th className="px-3.5 py-2.5 font-semibold">Bib</th>
                  <th className="px-3.5 py-2.5 font-semibold">Athlete</th>
                  <th className="px-3.5 py-2.5 font-semibold">Club</th>
                  <th className="px-3.5 py-2.5 font-semibold">Session</th>
                  <th className="px-3.5 py-2.5 font-semibold">Enrolled Categories</th>
                  <th className="px-3.5 py-2.5 font-semibold text-center">Fee</th>
                  <th className="px-3.5 py-2.5 font-semibold text-center">Status</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222732]">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-[#1b2029]">
                    <td className="px-3.5 py-2.5 font-mono text-zinc-400">
                      {row.targetNoFormatted || "—"}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-blue-400 font-semibold">
                      {row.archer.bibCode}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold text-zinc-100">
                        {row.archer.lastName.toUpperCase()}, {row.archer.firstName}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {row.archer.gender}
                        {row.archer.birthDate ? ` · DOB ${row.archer.birthDate.slice(0, 10)}` : ""}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="font-mono text-zinc-300">{row.club?.code ?? "IND"}</span>
                      <span className="text-zinc-500 ml-1.5 hidden xl:inline">{row.club?.name}</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-zinc-300">
                      {row.session ? `S${row.session.sessionNum}` : "—"}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {row.categories.map((cat) => (
                          <span
                            key={cat.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] border ${
                              cat.isPrimary
                                ? "bg-blue-500/15 text-blue-300 border-blue-500/30 font-semibold"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            {cat.divisionCode}/{cat.classCode}
                            {!cat.isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCategory(row.id, cat.id)}
                                title="Remove secondary category"
                                className="hover:text-red-300 ml-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleFee(row)}
                        title="Toggle fee paid"
                        className="inline-flex items-center justify-center"
                      >
                        {row.feePaid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleCycleStatus(row)}
                        title="Click to cycle status"
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          row.status === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {row.status}
                      </button>
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openMultiClassDrawer(row)}
                          disabled={activeTournament?.isLocked}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#2c3240] bg-[#1a1e26] hover:bg-[#242933] text-[11px] font-medium text-zinc-200 disabled:opacity-40"
                        >
                          <Layers className="w-3 h-3 text-blue-400" /> + Class
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOne(row)}
                          disabled={activeTournament?.isLocked}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {/* Import Wizard Modal */}
      {showImportModal && activeTournament && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleRunImport}
            className="w-full max-w-2xl bg-[#14171d] border border-[#2c3240] rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Unified Participant Importer</h3>
                <p className="text-[11px] text-zinc-400">
                  Supports 21-column Ianseo .tab (TSV), EventBooking CSV, Cognito Forms CSV, and NockPoint CSV.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Template Downloads */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#101318] border border-[#262b36] rounded-lg px-3 py-2.5">
                <span className="text-xs text-zinc-300 font-medium">Need a clean starting template?</span>
                <div className="flex items-center gap-2">
                  <a
                    href="/api/participants/template?format=nockpoint"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1a1e26] border border-[#2c3240] hover:border-blue-500/50 text-[11px] text-blue-300 font-medium"
                  >
                    <Download className="w-3 h-3" /> NockPoint CSV
                  </a>
                  <a
                    href="/api/participants/template?format=ianseo_tsv"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1a1e26] border border-[#2c3240] hover:border-blue-500/50 text-[11px] text-blue-300 font-medium"
                  >
                    <Download className="w-3 h-3" /> 21-Col Ianseo .tab
                  </a>
                </div>
              </div>

              {/* Format & File Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Format Detection</label>
                  <select
                    value={importFormat}
                    onChange={(e) => setImportFormat(e.target.value as typeof importFormat)}
                    className="w-full bg-[#0d0f12] border border-[#2c3240] rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <option value="AUTO">Auto-Detect (TSV / CSV)</option>
                    <option value="IANSEO_TSV">21-Column Ianseo (.tab / TSV)</option>
                    <option value="NOCKPOINT_CSV">NockPoint Multi-Class CSV</option>
                    <option value="EVENTBOOKING_CSV">Joomla EventBooking CSV</option>
                    <option value="COGNITO_CSV">Cognito Forms CSV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Upload File (.tab, .tsv, .csv)</label>
                  <input
                    type="file"
                    accept=".tab,.tsv,.csv,.txt"
                    onChange={handleFileSelect}
                    className="w-full bg-[#0d0f12] border border-[#2c3240] rounded-lg px-2.5 py-1 text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:bg-[#242933] file:text-zinc-200 file:text-xs"
                  />
                </div>
              </div>

              {/* Raw Paste / Preview Box */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  File Contents (or paste rows directly)
                </label>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste CSV or 21-column tab-separated lines here..."
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg p-2.5 text-[11px] font-mono text-zinc-200"
                />
              </div>

              {/* Import Result Banner */}
              {importReport && (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    importReport.error
                      ? "bg-red-500/10 border-red-500/30 text-red-300"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                  }`}
                >
                  {importReport.error ? (
                    <p>{importReport.error}</p>
                  ) : (
                    <p className="font-semibold">
                      Detected <span className="font-mono">{importReport.formatDetected}</span> — Imported{" "}
                      {importReport.importedCount} archer(s), skipped {importReport.skippedCount}.
                    </p>
                  )}
                  {(importReport.warnings ?? []).length > 0 && (
                    <ul className="list-disc list-inside text-[11px] text-amber-300 max-h-24 overflow-y-auto">
                      {importReport.warnings?.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                  {(importReport.errors ?? []).length > 0 && (
                    <ul className="list-disc list-inside text-[11px] text-red-300 max-h-24 overflow-y-auto">
                      {importReport.errors?.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#222732]">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#2c3240] bg-[#1a1e26] text-xs text-zinc-300"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importing || !importText.trim()}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold"
                >
                  {importing ? "Importing..." : "Run Import"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Multi-Category Enrollment Modal */}
      {drawerRow && activeTournament && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddMultiClass}
            className="w-full max-w-md bg-[#14171d] border border-[#2c3240] rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Enroll Additional Category</h3>
                <p className="text-[11px] text-zinc-400">
                  {drawerRow.archer.firstName} {drawerRow.archer.lastName} ({drawerRow.archer.bibCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerRow(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {mcError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 space-y-2">
                  <p>{mcError}</p>
                  {mcSuggestedMode === "SEPARATE_SESSIONS" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMcMode("NEW_SLOT");
                        setMcError(null);
                      }}
                      className="text-[11px] font-semibold underline text-blue-300"
                    >
                      Switch to Separate Session mode →
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Enrollment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMcMode("SHARED_SCORE")}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      mcMode === "SHARED_SCORE"
                        ? "bg-blue-600/15 border-blue-500 text-white"
                        : "bg-[#0d0f12] border-[#262b36] text-zinc-400"
                    }`}
                  >
                    <div className="font-semibold">Shared Score</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Same target &amp; distance</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMcMode("NEW_SLOT")}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      mcMode === "NEW_SLOT"
                        ? "bg-blue-600/15 border-blue-500 text-white"
                        : "bg-[#0d0f12] border-[#262b36] text-zinc-400"
                    }`}
                  >
                    <div className="font-semibold">Separate Session</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">2nd shooting slot</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Division</label>
                  <select
                    value={mcDivision}
                    onChange={(e) => setMcDivision(e.target.value)}
                    className="w-full bg-[#0d0f12] border border-[#2c3240] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  >
                    {activeTournament.divisions.map((d) => (
                      <option key={d.id} value={d.code}>
                        {d.code} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Target Age Class</label>
                  <select
                    value={mcClass}
                    onChange={(e) => setMcClass(e.target.value)}
                    className="w-full bg-[#0d0f12] border border-[#2c3240] rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  >
                    {activeTournament.ageClasses.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {mcMode === "NEW_SLOT" && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Session (Must differ from current slot)
                  </label>
                  <select
                    value={mcSessionId}
                    onChange={(e) => setMcSessionId(e.target.value)}
                    className="w-full bg-[#0d0f12] border border-[#2c3240] rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {activeTournament.sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        S{s.sessionNum}: {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#222732]">
                <button
                  type="button"
                  onClick={() => setDrawerRow(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#2c3240] bg-[#1a1e26] text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mcSaving}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {mcSaving ? "Validating..." : "Confirm Enrollment"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
