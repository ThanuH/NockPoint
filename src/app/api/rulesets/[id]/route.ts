import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.ruleset.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Ruleset not found" }, { status: 404 });
    }
    if (existing.isBuiltIn) {
      return NextResponse.json(
        { error: "Built-in federation presets cannot be overwritten. Clone it to create a custom ruleset." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, goldsLabel, xnineLabel, configJson } = body;

    const updated = await prisma.ruleset.update({
      where: { id: params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(goldsLabel ? { goldsLabel: goldsLabel.trim() } : {}),
        ...(xnineLabel ? { xnineLabel: xnineLabel.trim() } : {}),
        ...(configJson ? { configJson: configJson as Prisma.InputJsonValue } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/rulesets/[id] error:", error);
    return NextResponse.json({ error: "Failed to update ruleset" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.ruleset.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Ruleset not found" }, { status: 404 });
    }
    if (existing.isBuiltIn) {
      return NextResponse.json({ error: "Built-in federation presets cannot be deleted." }, { status: 400 });
    }

    await prisma.ruleset.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/rulesets/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete ruleset" }, { status: 500 });
  }
}
