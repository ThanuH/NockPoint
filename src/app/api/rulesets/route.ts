import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureBuiltInRulesets } from "@/domain/rulesets/service";
import { RulesetConfig } from "@/domain/rulesets/presets";

export async function GET() {
  try {
    await ensureBuiltInRulesets();
    const rulesets = await prisma.ruleset.findMany({
      orderBy: [{ isBuiltIn: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(rulesets);
  } catch (error) {
    console.error("GET /api/rulesets error:", error);
    return NextResponse.json({ error: "Failed to fetch rulesets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      code,
      name,
      description = "",
      goldsLabel = "10+X",
      xnineLabel = "X",
      configJson,
    } = body as {
      code: string;
      name: string;
      description?: string;
      goldsLabel?: string;
      xnineLabel?: string;
      configJson: RulesetConfig;
    };

    const cleanCode = code?.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!cleanCode || !name?.trim()) {
      return NextResponse.json({ error: "code and name are required" }, { status: 400 });
    }
    if (!configJson || !Array.isArray(configJson.divisions) || !Array.isArray(configJson.ageClasses)) {
      return NextResponse.json(
        { error: "configJson must include divisions, ageClasses, defaultSessions, and distanceMatrix" },
        { status: 400 }
      );
    }

    const created = await prisma.ruleset.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        description: description.trim() || null,
        isBuiltIn: false,
        goldsLabel: goldsLabel.trim() || "10+X",
        xnineLabel: xnineLabel.trim() || "X",
        configJson: configJson as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/rulesets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create ruleset" },
      { status: 500 }
    );
  }
}
