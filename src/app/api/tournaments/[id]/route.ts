import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { isLocked, multiClassMode, name, location, venue } = body;

    const updated = await prisma.tournament.update({
      where: { id: params.id },
      data: {
        ...(typeof isLocked === "boolean" ? { isLocked } : {}),
        ...(multiClassMode ? { multiClassMode } : {}),
        ...(name ? { name } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(venue !== undefined ? { venue } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/tournaments/[id] error:", error);
    return NextResponse.json({ error: "Failed to update tournament" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.tournament.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (existing.isLocked) {
      return NextResponse.json(
        { error: "Cannot delete a locked tournament. Unlock it first." },
        { status: 400 }
      );
    }

    await prisma.tournament.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/tournaments/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete tournament" }, { status: 500 });
  }
}
