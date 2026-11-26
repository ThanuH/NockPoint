"use client";

import { useEffect, useState } from "react";
import { Plus, Copy, Trash2, Save, X } from "lucide-react";
import type {
  RulesetConfig,
  RulesetDivisionConfig,
  RulesetAgeClassConfig,
  RulesetSessionConfig,
} from "@/domain/rulesets/presets";

interface RulesetRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isBuiltIn: boolean;
  goldsLabel: string;
  xnineLabel: string;
  configJson: RulesetConfig;
}

interface TargetFaceItem {
  id: string;
  code: string;
  name: string;
  diameterCm: number;
}

interface FlatDistanceRow {
  divisionCode: string;
  ageClassCode: string;
  distanceNumber: number;
  distanceMeters: number;
  targetFaceCode: string;
  endsCount: number;
  arrowsPerEnd: number;
  maxScore: number;
}

function flattenDistanceMatrix(cfg: RulesetConfig): FlatDistanceRow[] {
  const rows: FlatDistanceRow[] = [];
  for (const block of cfg.distanceMatrix ?? []) {
    for (const divCode of block.divisionCodes) {
      for (const clsCode of block.ageClassCodes) {
        for (const d of block.distances) {
          rows.push({
            divisionCode: divCode,
            ageClassCode: clsCode,
            distanceNumber: d.distanceNumber,
            distanceMeters: d.distanceMeters,
            targetFaceCode: d.targetFaceCode,
            endsCount: d.endsCount,
            arrowsPerEnd: d.arrowsPerEnd,
            maxScore: d.maxScore,
          });
        }
      }
    }
  }
  return rows;
}

function packDistanceRows(rows: FlatDistanceRow[]): RulesetConfig["distanceMatrix"] {
  const grouped = new Map<string, FlatDistanceRow[]>();
  for (const r of rows) {
    const key = `${r.divisionCode}::${r.ageClassCode}`;
    const list = grouped.get(key) ?? [];
    list.push(r);
    grouped.set(key, list);
  }
  return Array.from(grouped.entries()).map(([key, dists]) => {
    const [divisionCode, ageClassCode] = key.split("::");
    return {
      divisionCodes: [divisionCode],
      ageClassCodes: [ageClassCode],
      distances: dists.map((d) => ({
        distanceNumber: Number(d.distanceNumber),
        distanceMeters: Number(d.distanceMeters),
        targetFaceCode: d.targetFaceCode,
        endsCount: Number(d.endsCount),
        arrowsPerEnd: Number(d.arrowsPerEnd),
        maxScore: Number(d.maxScore),
      })),
    };
  });
}

export default function RulesetsPage() {
  const [rulesets, setRulesets] = useState<RulesetRecord[]>([]);
  const [targetFaces, setTargetFaces] = useState<TargetFaceItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Editor state (used for Create New, Clone, or Edit Custom)
  const [editorMode, setEditorMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goldsLabel, setGoldsLabel] = useState("10+X");
  const [xnineLabel, setXnineLabel] = useState("X");
  const [sessions, setSessions] = useState<RulesetSessionConfig[]>([]);
  const [divisions, setDivisions] = useState<RulesetDivisionConfig[]>([]);
  const [ageClasses, setAgeClasses] = useState<RulesetAgeClassConfig[]>([]);
  const [distanceRows, setDistanceRows] = useState<FlatDistanceRow[]>([]);

  async function loadAll() {
    setLoading(true);
    const [rsRes, tfRes] = await Promise.all([fetch("/api/rulesets"), fetch("/api/target-faces")]);
    const rsData = await rsRes.json();
    const tfData = await tfRes.json();
    if (Array.isArray(rsData)) {
      setRulesets(rsData);
      if (rsData.length > 0 && (!selectedId || !rsData.some((r: RulesetRecord) => r.id === selectedId))) {
        setSelectedId(rsData[0].id);
      }
    }
    if (Array.isArray(tfData)) {
      setTargetFaces(tfData);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openBlankEditor() {
    setError(null);
    setEditorMode("create");
    setEditingId(null);
    setCode("CUSTOM_CLUB_2026");
    setName("Custom Club Championship");
    setDescription("Custom federation / club archery ruleset.");
    setGoldsLabel("10+X");
    setXnineLabel("X");
    setSessions([
      { sessionNum: 1, name: "Qualification Session 1", stage: "QUALIFICATION", maxBales: 24, archersPerBale: 4 },
    ]);
    setDivisions([{ code: "R", name: "Recurve", sortOrder: 1 }]);
    setAgeClasses([
      { code: "OPEN_M", name: "Open Men", gender: "M", validShootUpClasses: [], sortOrder: 1 },
      { code: "OPEN_W", name: "Open Women", gender: "W", validShootUpClasses: [], sortOrder: 2 },
    ]);
    setDistanceRows([
      {
        divisionCode: "R",
        ageClassCode: "OPEN_M",
        distanceNumber: 1,
        distanceMeters: 70,
        targetFaceCode: "FACE_122",
        endsCount: 6,
        arrowsPerEnd: 6,
        maxScore: 360,
      },
      {
        divisionCode: "R",
        ageClassCode: "OPEN_M",
        distanceNumber: 2,
        distanceMeters: 70,
        targetFaceCode: "FACE_122",
        endsCount: 6,
        arrowsPerEnd: 6,
        maxScore: 360,
      },
    ]);
  }

  function openCloneEditor(source: RulesetRecord) {
    setError(null);
    setEditorMode("create");
    setEditingId(null);
    setCode(`${source.code}_CUSTOM`);
    setName(`${source.name} (Custom)`);
    setDescription(source.description ?? "");
    setGoldsLabel(source.goldsLabel);
    setXnineLabel(source.xnineLabel);
    setSessions(source.configJson.defaultSessions ?? []);
    setDivisions(source.configJson.divisions ?? []);
    setAgeClasses(source.configJson.ageClasses ?? []);
    setDistanceRows(flattenDistanceMatrix(source.configJson));
  }

  function openEditEditor(source: RulesetRecord) {
    setError(null);
    setEditorMode("edit");
    setEditingId(source.id);
    setCode(source.code);
    setName(source.name);
    setDescription(source.description ?? "");
    setGoldsLabel(source.goldsLabel);
    setXnineLabel(source.xnineLabel);
    setSessions(source.configJson.defaultSessions ?? []);
    setDivisions(source.configJson.divisions ?? []);
    setAgeClasses(source.configJson.ageClasses ?? []);
    setDistanceRows(flattenDistanceMatrix(source.configJson));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const configJson: RulesetConfig = {
      defaultSessions: sessions.map((s, idx) => ({ ...s, sessionNum: idx + 1 })),
      divisions: divisions.map((d, idx) => ({ ...d, code: d.code.trim().toUpperCase(), sortOrder: idx + 1 })),
      ageClasses: ageClasses.map((c, idx) => ({ ...c, code: c.code.trim().toUpperCase(), sortOrder: idx + 1 })),
      distanceMatrix: packDistanceRows(distanceRows),
    };

    const url = editorMode === "edit" && editingId ? `/api/rulesets/${editingId}` : "/api/rulesets";
    const method = editorMode === "edit" ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, description, goldsLabel, xnineLabel, configJson }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Failed to save ruleset");
      return;
    }

    setEditorMode("closed");
    await loadAll();
    setSelectedId(data.id);
  }

  async function handleDelete(rs: RulesetRecord) {
    if (!confirm(`Delete custom ruleset "${rs.name}" (${rs.code})?`)) return;
    const res = await fetch(`/api/rulesets/${rs.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error);
      return;
    }
    setSelectedId(null);
    await loadAll();
  }

  const active = rulesets.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262b36] pb-4">
        <div>
          <h1 className="text-lg font-bold text-white">Ruleset Presets &amp; Custom Builder</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Includes Sri Lanka Archery Senior &amp; Junior Nationals, World Archery, JOAD, plus your own custom rulesets.
          </p>
        </div>
        <button
          type="button"
          onClick={openBlankEditor}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Custom Ruleset
        </button>
      </div>

      {/* Custom Ruleset Builder / Editor */}
      {editorMode !== "closed" && (
        <form onSubmit={handleSave} className="bg-[#14171d] border border-blue-500/40 rounded-xl overflow-hidden">
          <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              {editorMode === "edit" ? `Edit Custom Ruleset: ${code}` : "Create Custom Ruleset"}
            </span>
            <button
              type="button"
              onClick={() => setEditorMode("closed")}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-[#242933]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-5">
            {error && (
              <div className="px-3 py-2 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg">
                {error}
              </div>
            )}

            {/* Basic Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Ruleset Code *</label>
                <input
                  value={code}
                  disabled={editorMode === "edit"}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-100 disabled:opacity-50"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Display Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Golds Label</label>
                <input
                  value={goldsLabel}
                  onChange={(e) => setGoldsLabel(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">X / 9 Label</label>
                <input
                  value={xnineLabel}
                  onChange={(e) => setXnineLabel(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-5">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0d0f12] border border-[#2c3240] rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                />
              </div>
            </div>

            {/* Divisions & Sessions side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Divisions */}
              <div className="bg-[#101318] border border-[#262b36] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-300">Divisions ({divisions.length})</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setDivisions([...divisions, { code: "B", name: "Barebow", sortOrder: divisions.length + 1 }])
                    }
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    + Add Division
                  </button>
                </div>
                {divisions.map((div, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={div.code}
                      onChange={(e) => {
                        const copy = [...divisions];
                        copy[idx] = { ...copy[idx], code: e.target.value };
                        setDivisions(copy);
                      }}
                      placeholder="Code"
                      className="w-16 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs font-mono"
                    />
                    <input
                      value={div.name}
                      onChange={(e) => {
                        const copy = [...divisions];
                        copy[idx] = { ...copy[idx], name: e.target.value };
                        setDivisions(copy);
                      }}
                      placeholder="Division Name"
                      className="flex-1 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setDivisions(divisions.filter((_, i) => i !== idx))}
                      className="p-1 text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Sessions */}
              <div className="bg-[#101318] border border-[#262b36] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-300">Default Sessions ({sessions.length})</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setSessions([
                        ...sessions,
                        {
                          sessionNum: sessions.length + 1,
                          name: `Session ${sessions.length + 1}`,
                          stage: "QUALIFICATION",
                          maxBales: 24,
                          archersPerBale: 4,
                        },
                      ])
                    }
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    + Add Session
                  </button>
                </div>
                {sessions.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={s.name}
                      onChange={(e) => {
                        const copy = [...sessions];
                        copy[idx] = { ...copy[idx], name: e.target.value };
                        setSessions(copy);
                      }}
                      className="flex-1 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      value={s.maxBales}
                      onChange={(e) => {
                        const copy = [...sessions];
                        copy[idx] = { ...copy[idx], maxBales: Number(e.target.value) };
                        setSessions(copy);
                      }}
                      title="Max Bales"
                      className="w-16 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setSessions(sessions.filter((_, i) => i !== idx))}
                      className="p-1 text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Age Classes */}
            <div className="bg-[#101318] border border-[#262b36] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-300">
                  Age Classes &amp; Shoot-Up Paths ({ageClasses.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setAgeClasses([
                      ...ageClasses,
                      {
                        code: `CLS_${ageClasses.length + 1}`,
                        name: "New Class",
                        gender: "M",
                        validShootUpClasses: [],
                        sortOrder: ageClasses.length + 1,
                      },
                    ])
                  }
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                >
                  + Add Age Class
                </button>
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {ageClasses.map((cls, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      value={cls.code}
                      onChange={(e) => {
                        const copy = [...ageClasses];
                        copy[idx] = { ...copy[idx], code: e.target.value };
                        setAgeClasses(copy);
                      }}
                      placeholder="Code"
                      className="col-span-2 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs font-mono"
                    />
                    <input
                      value={cls.name}
                      onChange={(e) => {
                        const copy = [...ageClasses];
                        copy[idx] = { ...copy[idx], name: e.target.value };
                        setAgeClasses(copy);
                      }}
                      placeholder="Class Name"
                      className="col-span-4 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs"
                    />
                    <select
                      value={cls.gender}
                      onChange={(e) => {
                        const copy = [...ageClasses];
                        copy[idx] = { ...copy[idx], gender: e.target.value as "M" | "W" | "X" };
                        setAgeClasses(copy);
                      }}
                      className="col-span-1 bg-[#0d0f12] border border-[#2c3240] rounded-md px-1.5 py-1 text-xs"
                    >
                      <option value="M">M</option>
                      <option value="W">W</option>
                      <option value="X">X</option>
                    </select>
                    <input
                      value={(cls.validShootUpClasses ?? []).join(", ")}
                      onChange={(e) => {
                        const copy = [...ageClasses];
                        copy[idx] = {
                          ...copy[idx],
                          validShootUpClasses: e.target.value
                            .split(",")
                            .map((s) => s.trim().toUpperCase())
                            .filter(Boolean),
                        };
                        setAgeClasses(copy);
                      }}
                      placeholder="Shoot-up codes (comma separated)"
                      className="col-span-4 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setAgeClasses(ageClasses.filter((_, i) => i !== idx))}
                      className="col-span-1 justify-self-end p-1 text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Distance Rules */}
            <div className="bg-[#101318] border border-[#262b36] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-300">Distance Rules ({distanceRows.length})</h3>
                <button
                  type="button"
                  onClick={() =>
                    setDistanceRows([
                      ...distanceRows,
                      {
                        divisionCode: divisions[0]?.code ?? "R",
                        ageClassCode: ageClasses[0]?.code ?? "OPEN_M",
                        distanceNumber: 1,
                        distanceMeters: 70,
                        targetFaceCode: targetFaces[0]?.code ?? "FACE_122",
                        endsCount: 6,
                        arrowsPerEnd: 6,
                        maxScore: 360,
                      },
                    ])
                  }
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                >
                  + Add Distance Row
                </button>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {distanceRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                    <select
                      value={row.divisionCode}
                      onChange={(e) => {
                        const copy = [...distanceRows];
                        copy[idx] = { ...copy[idx], divisionCode: e.target.value };
                        setDistanceRows(copy);
                      }}
                      className="col-span-1 bg-[#0d0f12] border border-[#2c3240] rounded-md px-1.5 py-1 text-xs font-mono"
                    >
                      {divisions.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code}
                        </option>
                      ))}
                    </select>
                    <select
                      value={row.ageClassCode}
                      onChange={(e) => {
                        const copy = [...distanceRows];
                        copy[idx] = { ...copy[idx], ageClassCode: e.target.value };
                        setDistanceRows(copy);
                      }}
                      className="col-span-2 bg-[#0d0f12] border border-[#2c3240] rounded-md px-1.5 py-1 text-xs font-mono"
                    >
                      {ageClasses.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={row.distanceNumber}
                      onChange={(e) => {
                        const copy = [...distanceRows];
                        copy[idx] = { ...copy[idx], distanceNumber: Number(e.target.value) };
                        setDistanceRows(copy);
                      }}
                      title="Distance #"
                      className="col-span-1 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs text-center"
                    />
                    <input
                      type="number"
                      value={row.distanceMeters}
                      onChange={(e) => {
                        const copy = [...distanceRows];
                        copy[idx] = { ...copy[idx], distanceMeters: Number(e.target.value) };
                        setDistanceRows(copy);
                      }}
                      title="Meters"
                      className="col-span-1 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs text-right"
                    />
                    <select
                      value={row.targetFaceCode}
                      onChange={(e) => {
                        const copy = [...distanceRows];
                        copy[idx] = { ...copy[idx], targetFaceCode: e.target.value };
                        setDistanceRows(copy);
                      }}
                      className="col-span-3 bg-[#0d0f12] border border-[#2c3240] rounded-md px-1.5 py-1 text-xs"
                    >
                      {targetFaces.map((tf) => (
                        <option key={tf.code} value={tf.code}>
                          {tf.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={row.endsCount}
                      onChange={(e) => {
                        const copy = [...distanceRows];
                        const ends = Number(e.target.value);
                        copy[idx] = { ...copy[idx], endsCount: ends, maxScore: ends * copy[idx].arrowsPerEnd * 10 };
                        setDistanceRows(copy);
                      }}
                      title="Ends"
                      className="col-span-1 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs text-right"
                    />
                    <input
                      type="number"
                      value={row.arrowsPerEnd}
                      onChange={(e) => {
                        const copy = [...distanceRows];
                        const arrows = Number(e.target.value);
                        copy[idx] = { ...copy[idx], arrowsPerEnd: arrows, maxScore: copy[idx].endsCount * arrows * 10 };
                        setDistanceRows(copy);
                      }}
                      title="Arrows/End"
                      className="col-span-1 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs text-right"
                    />
                    <input
                      type="number"
                      value={row.maxScore}
                      onChange={(e) => {
                        const copy = [...distanceRows];
                        copy[idx] = { ...copy[idx], maxScore: Number(e.target.value) };
                        setDistanceRows(copy);
                      }}
                      title="Max Score"
                      className="col-span-1 bg-[#0d0f12] border border-[#2c3240] rounded-md px-2 py-1 text-xs text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setDistanceRows(distanceRows.filter((_, i) => i !== idx))}
                      className="col-span-1 justify-self-end p-1 text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#222732]">
              <button
                type="button"
                onClick={() => setEditorMode("closed")}
                className="px-3.5 py-1.5 rounded-lg border border-[#2c3240] bg-[#1a1e26] text-zinc-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save Ruleset"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Ruleset Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <aside className="lg:col-span-4 bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden">
          <div className="bg-[#1a1e26] border-b border-[#262b36] px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Available Rulesets ({rulesets.length})
          </div>
          {loading ? (
            <div className="p-4 text-xs text-zinc-500">Loading...</div>
          ) : (
            <div className="p-2 space-y-1.5">
              {rulesets.map((rs) => {
                const isSelected = rs.id === selectedId;
                return (
                  <button
                    key={rs.id}
                    type="button"
                    onClick={() => setSelectedId(rs.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors border ${
                      isSelected
                        ? "bg-[#1d232e] border-blue-500/60"
                        : "bg-transparent border-transparent hover:bg-[#191d25]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-blue-400">{rs.code}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                          rs.isBuiltIn
                            ? "bg-zinc-800 text-zinc-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {rs.isBuiltIn ? "BUILT-IN" : "CUSTOM"}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-100 mt-1">{rs.name}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 tabular-nums">
                      {(rs.configJson.divisions ?? []).length} divs · {(rs.configJson.ageClasses ?? []).length} classes ·{" "}
                      {flattenDistanceMatrix(rs.configJson).length} distances
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="lg:col-span-8 bg-[#14171d] border border-[#262b36] rounded-xl overflow-hidden">
          {!active ? (
            <div className="p-8 text-center text-xs text-zinc-500">Select a ruleset to inspect its rules.</div>
          ) : (
            <>
              <div className="bg-[#1a1e26] border-b border-[#262b36] px-4 py-3.5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-md">
                      {active.code}
                    </span>
                    <h2 className="text-sm font-bold text-white">{active.name}</h2>
                  </div>
                  {active.description && (
                    <p className="text-xs text-zinc-400 mt-1.5 max-w-2xl">{active.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCloneEditor(active)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2c3240] bg-[#14171d] hover:bg-[#222732] text-xs font-medium text-zinc-200"
                  >
                    <Copy className="w-3.5 h-3.5" /> Clone as Custom
                  </button>
                  {!active.isBuiltIn && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditEditor(active)}
                        className="px-2.5 py-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-xs font-medium text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(active)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Distance &amp; Target Face Matrix ({flattenDistanceMatrix(active.configJson).length} rules)
                  </h3>
                  <div className="overflow-x-auto border border-[#262b36] rounded-lg max-h-80 overflow-y-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="sticky top-0 bg-[#1a1e26] border-b border-[#262b36] text-zinc-400">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Div</th>
                          <th className="px-3 py-2 font-semibold">Class</th>
                          <th className="px-3 py-2 font-semibold text-center">Dist #</th>
                          <th className="px-3 py-2 font-semibold text-right">Meters</th>
                          <th className="px-3 py-2 font-semibold">Target Face</th>
                          <th className="px-3 py-2 font-semibold text-right">Format</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222732] tabular-nums">
                        {flattenDistanceMatrix(active.configJson).map((r, i) => (
                          <tr key={i} className="hover:bg-[#1b2029]">
                            <td className="px-3 py-1.5 font-mono text-blue-400 font-bold">{r.divisionCode}</td>
                            <td className="px-3 py-1.5 font-mono text-zinc-200">{r.ageClassCode}</td>
                            <td className="px-3 py-1.5 text-center text-zinc-400">D{r.distanceNumber}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-white">{r.distanceMeters} m</td>
                            <td className="px-3 py-1.5 font-mono text-zinc-300">{r.targetFaceCode}</td>
                            <td className="px-3 py-1.5 text-right text-zinc-400">
                              {r.endsCount} × {r.arrowsPerEnd} (Max {r.maxScore})
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
