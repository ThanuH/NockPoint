import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseUnifiedParticipantFile } from "@/domain/importers/csvImporter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tournamentId,
      content,
      format = "AUTO",
    } = body as {
      tournamentId: string;
      content: string;
      format?: "AUTO" | "IANSEO_TSV" | "EVENTBOOKING_CSV" | "COGNITO_CSV" | "NOCKPOINT_CSV";
    };

    if (!tournamentId || !content?.trim()) {
      return NextResponse.json({ error: "tournamentId and file content are required" }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        sessions: { orderBy: { sessionNum: "asc" } },
        divisions: true,
        ageClasses: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (tournament.isLocked) {
      return NextResponse.json({ error: "Tournament is locked. Unlock before importing." }, { status: 400 });
    }

    const parsed = parseUnifiedParticipantFile(content, format);
    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid participant rows found in file.",
          formatDetected: parsed.formatDetected,
          warnings: parsed.warnings,
        },
        { status: 400 }
      );
    }

    const sessionByNum = new Map(tournament.sessions.map((s) => [s.sessionNum, s.id]));
    const defaultSessionId = tournament.sessions[0]?.id ?? null;
    const validDivisions = new Set(tournament.divisions.map((d) => d.code));
    const validClasses = new Set(tournament.ageClasses.map((c) => c.code));

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const row of parsed.rows) {
      try {
        const divisionCode = validDivisions.has(row.divisionCode)
          ? row.divisionCode
          : tournament.divisions[0]?.code ?? row.divisionCode;

        const primaryClassCode = validClasses.has(row.primaryClassCode)
          ? row.primaryClassCode
          : tournament.ageClasses.find((c) => c.gender === row.gender)?.code ??
            tournament.ageClasses[0]?.code ??
            row.primaryClassCode;

        const sessionId =
          row.sessionNum !== null
            ? sessionByNum.get(row.sessionNum) ?? defaultSessionId
            : defaultSessionId;

        const targetNoFormatted =
          row.baleNumber && row.targetLetter
            ? `${row.sessionNum ?? 1}${String(row.baleNumber).padStart(3, "0")}${row.targetLetter}`
            : null;

        await prisma.$transaction(async (tx) => {
          const club = await tx.club.upsert({
            where: { tournamentId_code: { tournamentId, code: row.clubCode } },
            update: { name: row.clubName },
            create: {
              tournamentId,
              code: row.clubCode,
              name: row.clubName,
            },
          });

          const archer = await tx.archer.upsert({
            where: { bibCode: row.bibCode },
            update: {
              firstName: row.firstName,
              lastName: row.lastName,
              gender: row.gender,
              ...(row.birthDate ? { birthDate: new Date(row.birthDate) } : {}),
              ...(row.email ? { email: row.email } : {}),
            },
            create: {
              bibCode: row.bibCode,
              firstName: row.firstName,
              lastName: row.lastName,
              gender: row.gender,
              birthDate: row.birthDate ? new Date(row.birthDate) : null,
              email: row.email ?? null,
            },
          });

          // Skip if this archer already has a slot in the same session
          const existing = await tx.tournamentRegistration.findFirst({
            where: {
              tournamentId,
              archerId: archer.id,
              sessionId,
            },
          });

          if (existing) {
            skippedCount++;
            errors.push(`Line ${row.lineNumber} (${row.bibCode}): already registered in this session (skipped).`);
            return;
          }

          const secondaryToCreate = row.secondaryClassCodes
            .filter((cls) => validClasses.has(cls) && cls !== primaryClassCode)
            .map((cls) => ({
              divisionCode,
              classCode: cls,
              isPrimary: false,
            }));

          await tx.tournamentRegistration.create({
            data: {
              tournamentId,
              archerId: archer.id,
              clubId: club.id,
              sessionId,
              divisionCode,
              primaryClassCode,
              baleNumber: row.baleNumber,
              targetLetter: row.targetLetter,
              targetNoFormatted,
              bowSharingGroup: row.bowSharingGroup ?? null,
              categories: {
                create: [
                  { divisionCode, classCode: primaryClassCode, isPrimary: true },
                  ...secondaryToCreate,
                ],
              },
            },
          });

          importedCount++;
        });
      } catch (rowErr) {
        skippedCount++;
        errors.push(
          `Line ${row.lineNumber} (${row.bibCode}): ${
            rowErr instanceof Error ? rowErr.message : "Failed to import row"
          }`
        );
      }
    }

    return NextResponse.json({
      formatDetected: parsed.formatDetected,
      totalParsed: parsed.rows.length,
      importedCount,
      skippedCount,
      warnings: parsed.warnings,
      errors,
    });
  } catch (error) {
    console.error("POST /api/participants/import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
