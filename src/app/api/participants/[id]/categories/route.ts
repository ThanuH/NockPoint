import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { MultiClassMode } from "@/domain/rulesets/presets";
import { validateRegistrationRequest } from "@/domain/rulesets/registrationValidator";

/**
 * Attach an additional age class / division to an existing registered archer:
 *  - mode = "SHARED_SCORE": Adds a RegistrationCategory to this same shooting slot.
 *  - mode = "NEW_SLOT": Creates a 2nd TournamentRegistration in a different session.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      mode = "SHARED_SCORE",
      divisionCode,
      classCode,
      sessionId,
    } = body as {
      mode: "SHARED_SCORE" | "NEW_SLOT";
      divisionCode: string;
      classCode: string;
      sessionId?: string | null;
    };

    const baseReg = await prisma.tournamentRegistration.findUnique({
      where: { id: params.id },
      include: {
        archer: true,
        tournament: {
          include: {
            ageClasses: true,
            distanceRules: { include: { division: true, ageClass: true } },
          },
        },
      },
    });

    if (!baseReg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const allSlotsForArcher = await prisma.tournamentRegistration.findMany({
      where: {
        tournamentId: baseReg.tournamentId,
        archerId: baseReg.archerId,
      },
      include: { categories: true },
    });

    const validation = validateRegistrationRequest({
      tournamentIsLocked: baseReg.tournament.isLocked,
      multiClassMode: baseReg.tournament.multiClassMode as MultiClassMode,
      modeRequested: mode,
      archerGender: baseReg.archer.gender,
      archerBirthDate: baseReg.archer.birthDate,
      competitionDate: baseReg.tournament.startDate,
      targetDivisionCode: divisionCode,
      targetClassCode: classCode,
      targetSessionId: sessionId || null,
      targetRegistrationId: baseReg.id,
      existingSlots: allSlotsForArcher.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        divisionCode: r.divisionCode,
        primaryClassCode: r.primaryClassCode,
        enrolledCategories: r.categories.map((c) => ({
          divisionCode: c.divisionCode,
          classCode: c.classCode,
        })),
      })),
      ageClasses: baseReg.tournament.ageClasses,
      distanceRules: baseReg.tournament.distanceRules.map((dr) => ({
        divisionCode: dr.division.code,
        ageClassCode: dr.ageClass.code,
        distanceNumber: dr.distanceNumber,
        distanceMeters: dr.distanceMeters,
        targetFaceId: dr.targetFaceId,
        endsCount: dr.endsCount,
        arrowsPerEnd: dr.arrowsPerEnd,
      })),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason, suggestedMode: validation.suggestedMode },
        { status: 400 }
      );
    }

    if (mode === "SHARED_SCORE") {
      const cat = await prisma.registrationCategory.create({
        data: {
          registrationId: baseReg.id,
          divisionCode,
          classCode,
          isPrimary: false,
        },
      });
      return NextResponse.json({ mode: "SHARED_SCORE", category: cat }, { status: 201 });
    }

    // Separate Session (NEW_SLOT)
    const newSlot = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: baseReg.tournamentId,
        archerId: baseReg.archerId,
        clubId: baseReg.clubId,
        sessionId: sessionId || null,
        divisionCode,
        primaryClassCode: classCode,
        feePaid: baseReg.feePaid,
        parentalApprovalReceived: baseReg.parentalApprovalReceived,
        categories: {
          create: {
            divisionCode,
            classCode,
            isPrimary: true,
          },
        },
      },
      include: {
        archer: true,
        club: true,
        session: true,
        categories: true,
      },
    });

    return NextResponse.json({ mode: "NEW_SLOT", registration: newSlot }, { status: 201 });
  } catch (error) {
    console.error("POST /api/participants/[id]/categories error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId query param is required" }, { status: 400 });
    }

    const cat = await prisma.registrationCategory.findUnique({
      where: { id: categoryId },
      include: { registration: { include: { tournament: true } } },
    });

    if (!cat || cat.registrationId !== params.id) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    if (cat.registration.tournament.isLocked) {
      return NextResponse.json({ error: "Tournament is locked." }, { status: 400 });
    }
    if (cat.isPrimary) {
      return NextResponse.json(
        { error: "Cannot remove the primary category of a shooting slot. Delete the slot instead." },
        { status: 400 }
      );
    }

    await prisma.registrationCategory.delete({ where: { id: categoryId } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/participants/[id]/categories error:", error);
    return NextResponse.json({ error: "Failed to remove category" }, { status: 500 });
  }
}
