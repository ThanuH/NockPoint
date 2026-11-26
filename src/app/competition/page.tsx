"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Unlock, Trash2, Plus } from "lucide-react";

interface RulesetOption {
  id: string;
  code: string;
  name: string;
  isBuiltIn: boolean;
}

interface TournamentItem {
  id: string;
  code: string;
  name: string;
  location: string | null;
  venue: string | null;
  startDate: string;
  endDate: string;
  ruleset: string;
  multiClassMode: string;
  goldsLabel: string;
  xnineLabel: string;
  isLocked: boolean;
  sessions: { id: string; sessionNum: number; name: string; stage: string; maxBales: number; archersPerBale: number }[];
  divisions: { id: string; code: string; name: string }[];
  ageClasses: {
    id: string;
    code: string;
    name: string;
    gender: string;
    minAge: number | null;
    maxAge: number | null;
    validShootUpClasses: string[];
  }[];
  distanceRules: {
    id: string;
    distanceNumber: number;
    distanceMeters: number;
    endsCount: number;
    arrowsPerEnd: number;
    maxScore: number;
    division: { code: string; name: string };
    ageClass: { code: string; name: string };
    targetFace: { name: string; diameterCm: number };
  }[];
}

const MULTI_CLASS_OPTIONS = [
  { value: "SINGLE_STRICT", label: "Single Class Strict (Legacy Ianseo)" },
  { value: "SEPARATE_SESSIONS", label: "Separate Sessions (Shoot Twice)" },
  { value: "SHARED_SCORE", label: "Shared Score (Rank in Multiple Classes)" },
  { value: "BOTH", label: "Both (Separate Sessions + Shared Score)" },
];

type InspectorTab = "distances" | "classes" | "sessions";

export default function CompetitionSetupPage() {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [availableRulesets, setAvailableRulesets] = useState<RulesetOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InspectorTab>("distances");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("SLAA-NAC-2026");
  const [name, setName] = useState("Sri Lanka National Archery Championship 2026");
  const [location, setLocation] = useState("Katunayake");
  const [venue, setVenue] = useState("BOI Sports Complex");
  const [startDate, setStartDate] = useState("2026-12-01");
  const [endDate, setEndDate] = useState("2026-12-03");
  const [ruleset, setRuleset] = useState("SL_SENIOR_NATIONALS");
  const [multiClassMode, setMultiClassMode] = useState("BOTH");

  async function fetchTournaments() {
    setLoading(true);
    const [tRes, rsRes] = await Promise.all([fetch("/api/tournaments"), fetch("/api/rulesets")]);
    const data = await tRes.json();
    const rsData = await rsRes.json();
    if (Array.isArray(rsData)) {
      setAvailableRulesets(rsData);
    }
    if (Array.isArray(data)) {
      setTournaments(data);
      if (data.length === 0) {
        setShowCreateForm(true);
      } else if (!selectedId || !data.some((t: TournamentItem) => t.id === selectedId)) {
        setSelectedId(data[0].id);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTournaments();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, location, venue, startDate, endDate, ruleset, multiClassMode }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      setError(data.error || "Failed to create tournament");
      return;
    }

    setShowCreateForm(false);
    await fetchTournaments();
    setSelectedId(data.id);
  }

  async function handleToggleLock(t: TournamentItem) {
    await fetch(`/api/tournaments/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLocked: !t.isLocked }),
    });
    await fetchTournaments();
  }

  async function handleModeChange(t: TournamentItem, newMode: string) {
    await fetch(`/api/tournaments/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ multiClassMode: newMode }),
    });
    await fetchTournaments();
  }

  async function handleDelete(t: TournamentItem) {
    if (!confirm(`Delete tournament "${t.name}" (${t.code})?`)) return;
    const res = await fetch(`/api/tournaments/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error);
      return;
    }
    setSelectedId(null);
    await fetchTournaments();
  }

  const active = tournaments.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      {/* Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262b36] pb-4">
        <div>
          <h1 className="text-lg font-bold text-white">Competition Info &amp; Ruleset Configuration</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage tournament parameters, federation presets, shooting sessions, and multi-class policies.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {showCreateForm ? "Hide Create Form" : "New Tournament"}
        </button>
      </div>

      {/* Collapsible New Tournament Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden"
        >
          <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-2.5 text-xs font-semibold text-zinc-200">
            Create New Competition from Federation Preset
          </div>
          <div className="p-4 space-y-4">
            {error && (
              <div className="px-3 py-2 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Tournament Code *</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-100"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Competition Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Location / City</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Venue</label>
                <input
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-zinc-400">Ruleset Preset *</label>
                  <Link href="/rulesets" className="text-[11px] text-blue-400 hover:underline">
                    + Custom
                  </Link>
                </div>
                <select
                  value={ruleset}
                  onChange={(e) => setRuleset(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                >
                  {availableRulesets.length === 0 ? (
                    <>
                      <option value="SL_SENIOR_NATIONALS">Sri Lanka Archery Senior Nationals (SLAA)</option>
                      <option value="SL_JUNIOR_NATIONALS">Sri Lanka Archery Junior Nationals (SLAA JNAC)</option>
                      <option value="WA_720">World Archery 720 Round (Outdoor)</option>
                      <option value="WA_INDOOR_18M">World Archery Indoor 18m (600 Round)</option>
                      <option value="WA_1440">World Archery 1440 Round (4 Distances)</option>
                      <option value="USA_JOAD">USA Archery JOAD Outdoor</option>
                    </>
                  ) : (
                    availableRulesets.map((rs) => (
                      <option key={rs.id} value={rs.code}>
                        {rs.isBuiltIn ? rs.name : `[Custom] ${rs.name}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3 pt-3 border-t border-[#222732]">
              <div className="w-full sm:w-80">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Multi-Age-Category Participation Policy
                </label>
                <select
                  value={multiClassMode}
                  onChange={(e) => setMultiClassMode(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                >
                  {MULTI_CLASS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#2c3240] bg-[#1a1e26] hover:bg-[#232833] text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                >
                  {creating ? "Generating..." : "Create & Auto-Configure"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar: Tournament Registry */}
        <aside className="lg:col-span-3 bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden">
          <div className="bg-[#1a1e26] border-b border-[#262b36] px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Tournaments ({tournaments.length})
          </div>

          {loading ? (
            <div className="p-4 text-xs text-zinc-500">Loading...</div>
          ) : tournaments.length === 0 ? (
            <div className="p-4 text-xs text-zinc-500">No tournaments yet.</div>
          ) : (
            <div className="p-2 space-y-1.5">
              {tournaments.map((t) => {
                const isSelected = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors border ${
                      isSelected
                        ? "bg-[#1d232e] border-blue-500/60"
                        : "bg-transparent border-transparent hover:bg-[#191d25]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-blue-400">{t.code}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                          t.isLocked
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {t.isLocked ? "LOCKED" : "OPEN"}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-100 mt-1 truncate">{t.name}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">
                      {t.ruleset} • {t.startDate.slice(0, 10)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Right Panel: Selected Tournament Workbench */}
        <section className="lg:col-span-9 bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden">
          {!active ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              Select a tournament from the left list or create a new one.
            </div>
          ) : (
            <>
              {/* Tournament Summary Header */}
              <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-md">
                      {active.code}
                    </span>
                    <h2 className="text-sm font-bold text-white">{active.name}</h2>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1.5 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
                    <span>
                      Ruleset: <strong className="text-zinc-200">{active.ruleset}</strong>
                    </span>
                    <span>
                      Dates: <strong className="text-zinc-200">{active.startDate.slice(0, 10)}</strong> to{" "}
                      <strong className="text-zinc-200">{active.endDate.slice(0, 10)}</strong>
                    </span>
                    <span>
                      Golds / X-9:{" "}
                      <strong className="text-zinc-200">
                        {active.goldsLabel} / {active.xnineLabel}
                      </strong>
                    </span>
                    {active.location && (
                      <span>
                        Location: <strong className="text-zinc-200">{active.location}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={active.multiClassMode}
                    disabled={active.isLocked}
                    onChange={(e) => handleModeChange(active, e.target.value)}
                    className="bg-[#0d0f12] border border-[#2c3240] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 disabled:opacity-40"
                    title="Multi-Age-Category Participation Mode"
                  >
                    {MULTI_CLASS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleToggleLock(active)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2c3240] bg-[#14171d] hover:bg-[#222732] text-xs font-medium text-zinc-200 transition-colors"
                  >
                    {active.isLocked ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    {active.isLocked ? "Unlock" : "Lock"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(active)}
                    disabled={active.isLocked}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-300 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Rounded Pill Sub-Navigation Tabs */}
              <div className="border-b border-[#262b36] bg-[#14171d] px-4 py-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("distances")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "distances"
                      ? "bg-[#242933] text-white border border-[#343b48]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1e26] border border-transparent"
                  }`}
                >
                  Distance Rules ({active.distanceRules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("classes")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "classes"
                      ? "bg-[#242933] text-white border border-[#343b48]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1e26] border border-transparent"
                  }`}
                >
                  Divisions ({active.divisions.length}) &amp; Age Classes ({active.ageClasses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("sessions")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === "sessions"
                      ? "bg-[#242933] text-white border border-[#343b48]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1e26] border border-transparent"
                  }`}
                >
                  Shooting Sessions ({active.sessions.length})
                </button>
              </div>

              {/* Tab Body */}
              <div className="p-4">
                {activeTab === "distances" && (
                  <div className="overflow-x-auto border border-[#262b36] rounded-lg">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#1a1e26] border-b border-[#262b36] text-zinc-400">
                          <th className="px-3.5 py-2.5 font-semibold">Division</th>
                          <th className="px-3.5 py-2.5 font-semibold">Age Class</th>
                          <th className="px-3.5 py-2.5 font-semibold text-center">Dist #</th>
                          <th className="px-3.5 py-2.5 font-semibold text-right">Distance</th>
                          <th className="px-3.5 py-2.5 font-semibold">Target Face</th>
                          <th className="px-3.5 py-2.5 font-semibold text-right">Ends × Arrows</th>
                          <th className="px-3.5 py-2.5 font-semibold text-right">Max</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222732] tabular-nums">
                        {active.distanceRules.map((dr) => (
                          <tr key={dr.id} className="hover:bg-[#1b2029]">
                            <td className="px-3.5 py-2 font-medium text-zinc-100">
                              <span className="font-mono text-blue-400 mr-1.5">{dr.division.code}</span>
                              {dr.division.name}
                            </td>
                            <td className="px-3.5 py-2 font-mono text-zinc-300">{dr.ageClass.code}</td>
                            <td className="px-3.5 py-2 text-center text-zinc-400">D{dr.distanceNumber}</td>
                            <td className="px-3.5 py-2 text-right font-semibold text-white">
                              {dr.distanceMeters} m
                            </td>
                            <td className="px-3.5 py-2 text-zinc-300">{dr.targetFace.name}</td>
                            <td className="px-3.5 py-2 text-right text-zinc-400">
                              {dr.endsCount} × {dr.arrowsPerEnd}
                            </td>
                            <td className="px-3.5 py-2 text-right font-semibold text-zinc-100">
                              {dr.maxScore}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === "classes" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                        Bow Divisions
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {active.divisions.map((div) => (
                          <span
                            key={div.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1a1e26] border border-[#2c3240] rounded-lg text-xs text-zinc-200"
                          >
                            <strong className="font-mono text-blue-400">{div.code}</strong>
                            <span>{div.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                        Age Classes &amp; Valid Shoot-Up Paths
                      </h3>
                      <div className="overflow-x-auto border border-[#262b36] rounded-lg">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-[#1a1e26] border-b border-[#262b36] text-zinc-400">
                              <th className="px-3.5 py-2.5 font-semibold">Code</th>
                              <th className="px-3.5 py-2.5 font-semibold">Description</th>
                              <th className="px-3.5 py-2.5 font-semibold text-center">Gender</th>
                              <th className="px-3.5 py-2.5 font-semibold text-center">Age Range</th>
                              <th className="px-3.5 py-2.5 font-semibold">Valid Shoot-Up Classes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#222732]">
                            {active.ageClasses.map((cls) => (
                              <tr key={cls.id} className="hover:bg-[#1b2029]">
                                <td className="px-3.5 py-2 font-mono font-bold text-blue-400">{cls.code}</td>
                                <td className="px-3.5 py-2 text-zinc-100">{cls.name}</td>
                                <td className="px-3.5 py-2 text-center font-mono text-zinc-300">{cls.gender}</td>
                                <td className="px-3.5 py-2 text-center tabular-nums text-zinc-400">
                                  {cls.minAge ?? "—"} – {cls.maxAge ?? "—"}
                                </td>
                                <td className="px-3.5 py-2">
                                  {cls.validShootUpClasses.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {cls.validShootUpClasses.map((up) => (
                                        <span
                                          key={up}
                                          className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/25 text-blue-300 font-mono text-[11px] rounded-md"
                                        >
                                          {up}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-zinc-600">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "sessions" && (
                  <div className="overflow-x-auto border border-[#262b36] rounded-lg">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#1a1e26] border-b border-[#262b36] text-zinc-400">
                          <th className="px-3.5 py-2.5 font-semibold">Session #</th>
                          <th className="px-3.5 py-2.5 font-semibold">Name</th>
                          <th className="px-3.5 py-2.5 font-semibold">Stage</th>
                          <th className="px-3.5 py-2.5 font-semibold text-right">Bales</th>
                          <th className="px-3.5 py-2.5 font-semibold text-right">Archers / Bale</th>
                          <th className="px-3.5 py-2.5 font-semibold text-right">Total Capacity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222732] tabular-nums">
                        {active.sessions.map((s) => (
                          <tr key={s.id} className="hover:bg-[#1b2029]">
                            <td className="px-3.5 py-2.5 font-mono font-bold text-blue-400">S{s.sessionNum}</td>
                            <td className="px-3.5 py-2.5 font-medium text-zinc-100">{s.name}</td>
                            <td className="px-3.5 py-2.5 font-mono text-zinc-400">{s.stage}</td>
                            <td className="px-3.5 py-2.5 text-right text-zinc-300">{s.maxBales}</td>
                            <td className="px-3.5 py-2.5 text-right text-zinc-300">{s.archersPerBale}</td>
                            <td className="px-3.5 py-2.5 text-right font-semibold text-white">
                              {s.maxBales * s.archersPerBale}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
