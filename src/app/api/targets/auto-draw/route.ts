import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeAutoDraw } from "@/domain/targets/autoDraw";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tournamentId,
      sessionId,
      startBale = 1,
      action = "DRAW",
    } = body as {
      tournamentId: string;
      sessionId: string;
      startBale?: number;
      action?: "DRAW" | "CLEAR";
    };

    if (!tournamentId || !sessionId) {
      return NextResponse.json({ error: "tournamentId and sessionId are required" }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        sessions: true,
        distanceRules: {
          where: { distanceNumber: 1 },
          include: { division: true, ageClass: true, targetFace: true },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (tournament.isLocked) {
      return NextResponse.json({ error: "Tournament is locked. Unlock before changing targets." }, { status: 400 });
    }

    const session = tournament.sessions.find((s) => s.id === sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (action === "CLEAR") {
      const cleared = await prisma.tournamentRegistration.updateMany({
        where: { tournamentId, sessionId },
        data: { baleNumber: null, targetLetter: null, targetNoFormatted: null },
      });
      return NextResponse.json({ action: "CLEAR", clearedCount: cleared.count });
    }

    // Build distance-key map for Distance 1: "DIV::CLASS" -> "70m-FACE_122"
    const distanceKeyMap = new Map<string, string>();
    for (const dr of tournament.distanceRules) {
      distanceKeyMap.set(
        `${dr.division.code}::${dr.ageClass.code}`,
        `${dr.distanceMeters}m-${dr.targetFace.code}`
      );
    }

    const regs = await prisma.tournamentRegistration.findMany({
      where: {
        tournamentId,
        sessionId,
        status: "ACTIVE",
      },
      include: { club: true },
      orderBy: [{ divisionCode: "asc" }, { primaryClassCode: "asc" }, { createdAt: "asc" }],
    });

    const candidates = regs.map((r) => ({
      registrationId: r.id,
      archerId: r.archerId,
      clubCode: r.club?.code ?? "IND",
      divisionCode: r.divisionCode,
      primaryClassCode: r.primaryClassCode,
      distanceKey: distanceKeyMap.get(`${r.divisionCode}::${r.primaryClassCode}`) ?? `${r.divisionCode}-${r.primaryClassCode}`,
      bowSharingGroup: r.bowSharingGroup,
    }));

    const draw = computeAutoDraw({
      sessionNum: session.sessionNum,
      maxBales: session.maxBales,
      archersPerBale: session.archersPerBale,
      startBale: Number(startBale) || 1,
      candidates,
    });

    await prisma.$transaction(async (tx) => {
      // Clear existing assignments in this session first to avoid unique-slot collisions during reshuffle
      await tx.tournamentRegistration.updateMany({
        where: { tournamentId, sessionId },
        data: { baleNumber: null, targetLetter: null, targetNoFormatted: null },
      });

      for (const a of draw.assignments) {
        await tx.tournamentRegistration.update({
          where: { id: a.registrationId },
          data: {
            baleNumber: a.baleNumber,
            targetLetter: a.targetLetter,
            targetNoFormatted: a.targetNoFormatted,
          },
        });
      }
    });

    return NextResponse.json({
      action: "DRAW",
      assignedCount: draw.assignments.length,
      unassignedCount: draw.unassignedIds.length,
      balesUsed: draw.balesUsed,
      warnings: draw.warnings,
    });
  } catch (error) {
    console.error("POST /api/targets/auto-draw error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auto-draw failed" },
      { status: 500 }
    );
  }
}
