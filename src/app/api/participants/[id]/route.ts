import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatTargetNo } from "@/domain/targets/autoDraw";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.tournamentRegistration.findUnique({
      where: { id: params.id },
      include: { tournament: true, session: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }
    if (existing.tournament.isLocked) {
      return NextResponse.json({ error: "Tournament is locked." }, { status: 400 });
    }

    const body = await request.json();
    const {
      status,
      feePaid,
      parentalApprovalReceived,
      checkedIn,
      equipmentInspected,
      sessionId,
      baleNumber,
      targetLetter,
      bowSharingGroup,
    } = body;

    // Determine target updates
    let nextSessionId = existing.sessionId;
    let nextBale = existing.baleNumber;
    let nextLetter = existing.targetLetter;
    let nextTargetFormatted = existing.targetNoFormatted;

    if (sessionId !== undefined && sessionId !== existing.sessionId) {
      // Moving to a different session clears old target position to avoid collisions
      nextSessionId = sessionId || null;
      nextBale = null;
      nextLetter = null;
      nextTargetFormatted = null;
    }

    if (baleNumber !== undefined || targetLetter !== undefined) {
      nextBale = baleNumber ? Number(baleNumber) : null;
      nextLetter = targetLetter ? String(targetLetter).trim().toUpperCase() : null;

      if (nextBale && nextLetter) {
        const ses = nextSessionId
          ? await prisma.session.findUnique({ where: { id: nextSessionId } })
          : existing.session;
        nextTargetFormatted = formatTargetNo(ses?.sessionNum ?? 1, nextBale, nextLetter);
      } else {
        nextTargetFormatted = null;
      }
    }

    const updated = await prisma.tournamentRegistration.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(typeof feePaid === "boolean" ? { feePaid } : {}),
        ...(typeof parentalApprovalReceived === "boolean" ? { parentalApprovalReceived } : {}),
        ...(typeof checkedIn === "boolean" ? { checkedInAt: checkedIn ? new Date() : null } : {}),
        ...(typeof equipmentInspected === "boolean"
          ? { equipmentInspectedAt: equipmentInspected ? new Date() : null }
          : {}),
        ...(sessionId !== undefined ? { sessionId: nextSessionId } : {}),
        ...(baleNumber !== undefined || targetLetter !== undefined || sessionId !== undefined
          ? {
              baleNumber: nextBale,
              targetLetter: nextLetter,
              targetNoFormatted: nextTargetFormatted,
            }
          : {}),
        ...(bowSharingGroup !== undefined ? { bowSharingGroup: bowSharingGroup?.trim() || null } : {}),
      },
      include: {
        archer: true,
        club: true,
        session: true,
        categories: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/participants/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update registration" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.tournamentRegistration.findUnique({
      where: { id: params.id },
      include: { tournament: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }
    if (existing.tournament.isLocked) {
      return NextResponse.json({ error: "Tournament is locked." }, { status: 400 });
    }

    await prisma.tournamentRegistration.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/participants/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete registration" }, { status: 500 });
  }
}
