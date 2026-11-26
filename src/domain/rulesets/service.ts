import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BUILT_IN_RULESETS, RulesetConfig, RulesetPreset } from "./presets";

/**
 * Ensures all built-in federation presets exist in the database.
 */
export async function ensureBuiltInRulesets() {
  for (const preset of BUILT_IN_RULESETS) {
    const configJson = {
      defaultSessions: preset.defaultSessions,
      divisions: preset.divisions,
      ageClasses: preset.ageClasses,
      distanceMatrix: preset.distanceMatrix,
    } as unknown as Prisma.InputJsonValue;

    await prisma.ruleset.upsert({
      where: { code: preset.code },
      update: {},
      create: {
        code: preset.code,
        name: preset.name,
        description: preset.description,
        isBuiltIn: true,
        goldsLabel: preset.goldsLabel,
        xnineLabel: preset.xnineLabel,
        configJson,
      },
    });
  }
}

export async function getRulesetByCode(code: string): Promise<RulesetPreset | null> {
  let row = await prisma.ruleset.findUnique({ where: { code } });
  if (!row) {
    await ensureBuiltInRulesets();
    row = await prisma.ruleset.findUnique({ where: { code } });
  }
  if (!row) return null;

  const cfg = row.configJson as unknown as RulesetConfig;
  return {
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    goldsLabel: row.goldsLabel,
    xnineLabel: row.xnineLabel,
    isBuiltIn: row.isBuiltIn,
    defaultSessions: cfg.defaultSessions ?? [],
    divisions: cfg.divisions ?? [],
    ageClasses: cfg.ageClasses ?? [],
    distanceMatrix: cfg.distanceMatrix ?? [],
  };
}
