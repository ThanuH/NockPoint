import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { MultiClassMode } from "@/domain/rulesets/presets";
import { validateRegistrationRequest } from "@/domain/rulesets/registrationValidator";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");

    if (!tournamentId) {
      return NextResponse.json({ error: "tournamentId query param is required" }, { status: 400 });
    }

    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId },
      include: {
        archer: true,
        club: true,
        session: true,
        categories: {
          orderBy: [{ isPrimary: "desc" }, { classCode: "asc" }],
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json(registrations);
  } catch (error) {
    console.error("GET /api/participants error:", error);
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tournamentId,
      bibCode,
      firstName,
      lastName,
      gender = "M",
      birthDate,
      clubCode = "IND",
      clubName = "Independent",
      divisionCode,
      primaryClassCode,
      sessionId,
      bowSharingGroup,
      feePaid = false,
      parentalApprovalReceived = false,
    } = body as {
      tournamentId: string;
      bibCode?: string;
      firstName: string;
      lastName: string;
      gender?: string;
      birthDate?: string | null;
      clubCode?: string;
      clubName?: string;
      divisionCode: string;
      primaryClassCode: string;
      sessionId?: string | null;
      bowSharingGroup?: string | null;
      feePaid?: boolean;
      parentalApprovalReceived?: boolean;
    };

    if (!tournamentId || !firstName?.trim() || !lastName?.trim() || !divisionCode || !primaryClassCode) {
      return NextResponse.json(
        { error: "tournamentId, firstName, lastName, divisionCode, and primaryClassCode are required" },
        { status: 400 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        ageClasses: true,
        distanceRules: { include: { division: true, ageClass: true } },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    const parsedBirthDate = birthDate ? new Date(birthDate) : null;
    const normalizedBib =
      bibCode?.trim().toUpperCase() ||
      `NP-${Date.now().toString(36).toUpperCase().slice(-5)}-${Math.floor(Math.random() * 90 + 10)}`;

    // Check if archer already exists by bibCode
    const existingArcher = await prisma.archer.findUnique({
      where: { bibCode: normalizedBib },
      include: {
        registrations: {
          where: { tournamentId },
          include: { categories: true },
        },
      },
    });

    const validation = validateRegistrationRequest({
      tournamentIsLocked: tournament.isLocked,
      multiClassMode: tournament.multiClassMode as MultiClassMode,
      modeRequested: "NEW_SLOT",
      archerGender: existingArcher?.gender ?? gender,
      archerBirthDate: existingArcher?.birthDate ?? parsedBirthDate,
      competitionDate: tournament.startDate,
      targetDivisionCode: divisionCode,
      targetClassCode: primaryClassCode,
      targetSessionId: sessionId || null,
      existingSlots: (existingArcher?.registrations ?? []).map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        divisionCode: r.divisionCode,
        primaryClassCode: r.primaryClassCode,
        enrolledCategories: r.categories.map((c) => ({
          divisionCode: c.divisionCode,
          classCode: c.classCode,
        })),
      })),
      ageClasses: tournament.ageClasses,
      distanceRules: tournament.distanceRules.map((dr) => ({
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

    const created = await prisma.$transaction(async (tx) => {
      // 1. Upsert Club
      const cleanClubCode = (clubCode || "IND").trim().toUpperCase();
      const club = await tx.club.upsert({
        where: { tournamentId_code: { tournamentId, code: cleanClubCode } },
        update: clubName?.trim() ? { name: clubName.trim() } : {},
        create: {
          tournamentId,
          code: cleanClubCode,
          name: clubName?.trim() || cleanClubCode,
        },
      });

      // 2. Upsert Archer
      const archer = await tx.archer.upsert({
        where: { bibCode: normalizedBib },
        update: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender,
          ...(parsedBirthDate ? { birthDate: parsedBirthDate } : {}),
        },
        create: {
          bibCode: normalizedBib,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender,
          birthDate: parsedBirthDate,
        },
      });

      // 3. Create TournamentRegistration + primary RegistrationCategory
      return tx.tournamentRegistration.create({
        data: {
          tournamentId,
          archerId: archer.id,
          clubId: club.id,
          sessionId: sessionId || null,
          divisionCode,
          primaryClassCode,
          bowSharingGroup: bowSharingGroup?.trim() || null,
          feePaid,
          parentalApprovalReceived,
          categories: {
            create: {
              divisionCode,
              classCode: primaryClassCode,
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
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/participants error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register participant" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");

    if (!tournamentId) {
      return NextResponse.json({ error: "tournamentId query param is required" }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (tournament.isLocked) {
      return NextResponse.json({ error: "Tournament is locked." }, { status: 400 });
    }

    const result = await prisma.tournamentRegistration.deleteMany({
      where: { tournamentId },
    });

    return NextResponse.json({ deletedCount: result.count });
  } catch (error) {
    console.error("DELETE /api/participants error:", error);
    return NextResponse.json({ error: "Failed to delete participants" }, { status: 500 });
  }
}
