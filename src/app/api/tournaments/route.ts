import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MultiClassMode } from "@/domain/rulesets/presets";
import { getRulesetByCode } from "@/domain/rulesets/service";

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sessions: { orderBy: { sessionNum: "asc" } },
        divisions: { orderBy: { sortOrder: "asc" } },
        ageClasses: { orderBy: { sortOrder: "asc" } },
        distanceRules: {
          include: {
            division: true,
            ageClass: true,
            targetFace: true,
          },
          orderBy: [
            { division: { sortOrder: "asc" } },
            { ageClass: { sortOrder: "asc" } },
            { distanceNumber: "asc" },
          ],
        },
      },
    });

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error("GET /api/tournaments error:", error);
    return NextResponse.json({ error: "Failed to fetch tournaments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      code,
      name,
      location = "",
      venue = "",
      startDate,
      endDate,
      ruleset = "WA_720",
      multiClassMode = "BOTH",
    } = body as {
      code: string;
      name: string;
      location?: string;
      venue?: string;
      startDate: string;
      endDate: string;
      ruleset?: string;
      multiClassMode?: MultiClassMode;
    };

    if (!code?.trim() || !name?.trim() || !startDate || !endDate) {
      return NextResponse.json(
        { error: "code, name, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const preset = await getRulesetByCode(ruleset);
    if (!preset) {
      return NextResponse.json({ error: `Unknown ruleset: ${ruleset}` }, { status: 400 });
    }

    const targetFaces = await prisma.targetFace.findMany();
    const faceMap = new Map(targetFaces.map((f) => [f.code, f.id]));

    const created = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.create({
        data: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          location: location.trim() || null,
          venue: venue.trim() || null,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          ruleset: preset.code,
          multiClassMode,
          goldsLabel: preset.goldsLabel,
          xnineLabel: preset.xnineLabel,
        },
      });

      if (preset.defaultSessions.length > 0) {
        await tx.session.createMany({
          data: preset.defaultSessions.map((s) => ({
            tournamentId: tournament.id,
            sessionNum: s.sessionNum,
            name: s.name,
            stage: s.stage,
            maxBales: s.maxBales,
            archersPerBale: s.archersPerBale,
          })),
        });
      }

      const divisionIdByCode = new Map<string, string>();
      for (const d of preset.divisions) {
        const div = await tx.division.create({
          data: {
            tournamentId: tournament.id,
            code: d.code,
            name: d.name,
            sortOrder: d.sortOrder,
          },
        });
        divisionIdByCode.set(div.code, div.id);
      }

      const ageClassIdByCode = new Map<string, string>();
      for (const c of preset.ageClasses) {
        const cls = await tx.ageClass.create({
          data: {
            tournamentId: tournament.id,
            code: c.code,
            name: c.name,
            gender: c.gender,
            minAge: c.minAge ?? null,
            maxAge: c.maxAge ?? null,
            validShootUpClasses: c.validShootUpClasses ?? [],
            sortOrder: c.sortOrder,
          },
        });
        ageClassIdByCode.set(cls.code, cls.id);
      }

      const distanceRows: {
        tournamentId: string;
        divisionId: string;
        ageClassId: string;
        targetFaceId: string;
        distanceNumber: number;
        distanceMeters: number;
        endsCount: number;
        arrowsPerEnd: number;
        maxScore: number;
      }[] = [];

      const seenKeys = new Set<string>();

      for (const block of preset.distanceMatrix) {
        for (const divCode of block.divisionCodes) {
          const divisionId = divisionIdByCode.get(divCode);
          if (!divisionId) continue;

          for (const clsCode of block.ageClassCodes) {
            const ageClassId = ageClassIdByCode.get(clsCode);
            if (!ageClassId) continue;

            for (const dist of block.distances) {
              const key = `${divisionId}:${ageClassId}:${dist.distanceNumber}`;
              if (seenKeys.has(key)) continue;
              seenKeys.add(key);

              const targetFaceId = faceMap.get(dist.targetFaceCode);
              if (!targetFaceId) {
                throw new Error(`Missing seeded TargetFace: ${dist.targetFaceCode}. Run npx prisma db seed.`);
              }

              distanceRows.push({
                tournamentId: tournament.id,
                divisionId,
                ageClassId,
                targetFaceId,
                distanceNumber: dist.distanceNumber,
                distanceMeters: dist.distanceMeters,
                endsCount: dist.endsCount,
                arrowsPerEnd: dist.arrowsPerEnd,
                maxScore: dist.maxScore,
              });
            }
          }
        }
      }

      if (distanceRows.length > 0) {
        await tx.distanceRule.createMany({ data: distanceRows });
      }

      return tx.tournament.findUniqueOrThrow({
        where: { id: tournament.id },
        include: {
          sessions: true,
          divisions: true,
          ageClasses: true,
          distanceRules: { include: { division: true, ageClass: true, targetFace: true } },
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/tournaments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create tournament" },
      { status: 500 }
    );
  }
}
