import { PrismaClient, Prisma } from "@prisma/client";
import { BUILT_IN_RULESETS } from "../src/domain/rulesets/presets";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding World Archery Standard Target Faces...");

  const targetFaces = [
    {
      code: "FACE_122",
      name: "122cm Full Face (Outdoor 70m/60m)",
      diameterCm: 122.0,
      innerRingVal: 10,
      outerRingVal: 1,
      innerTenIsX: true,
      xNineIsGolds: false,
      scoringType: "STANDARD_10_RING",
    },
    {
      code: "FACE_80_6RING",
      name: "80cm 6-Ring Center Spot (Outdoor Compound 50m)",
      diameterCm: 80.0,
      innerRingVal: 10,
      outerRingVal: 5,
      innerTenIsX: true,
      xNineIsGolds: false,
      scoringType: "COMPOUND_6_RING",
    },
    {
      code: "FACE_80_FULL",
      name: "80cm Full Face (Outdoor 50m/30m/18m)",
      diameterCm: 80.0,
      innerRingVal: 10,
      outerRingVal: 1,
      innerTenIsX: true,
      xNineIsGolds: false,
      scoringType: "STANDARD_10_RING",
    },
    {
      code: "FACE_40_TRIPLE",
      name: "40cm Vertical Triple Spot (Indoor 18m Recurve & Compound)",
      diameterCm: 40.0,
      innerRingVal: 10,
      outerRingVal: 6,
      innerTenIsX: true,
      xNineIsGolds: true,
      scoringType: "INDOOR_TRIPLE_SPOT",
    },
    {
      code: "FACE_40_FULL",
      name: "40cm Full Face (Indoor 18m Barebow/Novice)",
      diameterCm: 40.0,
      innerRingVal: 10,
      outerRingVal: 1,
      innerTenIsX: true,
      xNineIsGolds: true,
      scoringType: "STANDARD_10_RING",
    },
  ];

  for (const face of targetFaces) {
    await prisma.targetFace.upsert({
      where: { code: face.code },
      update: face,
      create: face,
    });
  }

  console.log("🌱 Seeding Built-In Federation Ruleset Presets...");

  for (const preset of BUILT_IN_RULESETS) {
    const configJson = {
      defaultSessions: preset.defaultSessions,
      divisions: preset.divisions,
      ageClasses: preset.ageClasses,
      distanceMatrix: preset.distanceMatrix,
    } as unknown as Prisma.InputJsonValue;

    await prisma.ruleset.upsert({
      where: { code: preset.code },
      update: {
        name: preset.name,
        description: preset.description,
        isBuiltIn: true,
        goldsLabel: preset.goldsLabel,
        xnineLabel: preset.xnineLabel,
        configJson,
      },
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

  console.log(`✅ Seeded ${targetFaces.length} target faces and ${BUILT_IN_RULESETS.length} ruleset presets!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
