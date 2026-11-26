export type BuiltInRulesetCode =
  | "WA_720"
  | "WA_INDOOR_18M"
  | "WA_1440"
  | "USA_JOAD"
  | "SL_SENIOR_NATIONALS"
  | "SL_JUNIOR_NATIONALS";

export type MultiClassMode =
  | "SINGLE_STRICT"
  | "SEPARATE_SESSIONS"
  | "SHARED_SCORE"
  | "BOTH";

export interface RulesetSessionConfig {
  sessionNum: number;
  name: string;
  stage: "QUALIFICATION" | "ELIMINATION" | "FINAL";
  maxBales: number;
  archersPerBale: number;
}

export interface RulesetDivisionConfig {
  code: string;
  name: string;
  sortOrder: number;
}

export interface RulesetAgeClassConfig {
  code: string;
  name: string;
  gender: "M" | "W" | "X";
  minAge?: number | null;
  maxAge?: number | null;
  validShootUpClasses: string[];
  sortOrder: number;
}

export interface RulesetDistanceBlock {
  divisionCodes: string[];
  ageClassCodes: string[];
  distances: {
    distanceNumber: number;
    distanceMeters: number;
    targetFaceCode: string;
    endsCount: number;
    arrowsPerEnd: number;
    maxScore: number;
  }[];
}

export interface RulesetConfig {
  defaultSessions: RulesetSessionConfig[];
  divisions: RulesetDivisionConfig[];
  ageClasses: RulesetAgeClassConfig[];
  distanceMatrix: RulesetDistanceBlock[];
}

export interface RulesetPreset extends RulesetConfig {
  code: string;
  name: string;
  description: string;
  goldsLabel: string;
  xnineLabel: string;
  isBuiltIn?: boolean;
}

const STANDARD_AGE_CLASSES: RulesetAgeClassConfig[] = [
  { code: "U15M", name: "Under 15 Men", gender: "M", maxAge: 14, validShootUpClasses: ["U18M", "U21M", "OPEN_M"], sortOrder: 1 },
  { code: "U15W", name: "Under 15 Women", gender: "W", maxAge: 14, validShootUpClasses: ["U18W", "U21W", "OPEN_W"], sortOrder: 2 },
  { code: "U18M", name: "Under 18 Men (Cadet)", gender: "M", minAge: 15, maxAge: 17, validShootUpClasses: ["U21M", "OPEN_M"], sortOrder: 3 },
  { code: "U18W", name: "Under 18 Women (Cadet)", gender: "W", minAge: 15, maxAge: 17, validShootUpClasses: ["U21W", "OPEN_W"], sortOrder: 4 },
  { code: "U21M", name: "Under 21 Men (Junior)", gender: "M", minAge: 18, maxAge: 20, validShootUpClasses: ["OPEN_M"], sortOrder: 5 },
  { code: "U21W", name: "Under 21 Women (Junior)", gender: "W", minAge: 18, maxAge: 20, validShootUpClasses: ["OPEN_W"], sortOrder: 6 },
  { code: "OPEN_M", name: "Senior Men", gender: "M", validShootUpClasses: [], sortOrder: 7 },
  { code: "OPEN_W", name: "Senior Women", gender: "W", validShootUpClasses: [], sortOrder: 8 },
  { code: "50+M", name: "50+ Men (Master)", gender: "M", minAge: 50, validShootUpClasses: ["OPEN_M"], sortOrder: 9 },
  { code: "50+W", name: "50+ Women (Master)", gender: "W", minAge: 50, validShootUpClasses: ["OPEN_W"], sortOrder: 10 },
];

export const RULESET_PRESETS: Record<BuiltInRulesetCode, RulesetPreset> = {
  SL_SENIOR_NATIONALS: {
    code: "SL_SENIOR_NATIONALS",
    name: "Sri Lanka Archery Senior Nationals (SLAA)",
    description:
      "SLAA National Archery Championship & Selection Trial: Open 70m Recurve, Open 50m Compound (6-ring), Open 30m Recurve Novices, and Short Recurve Metric (50m + 30m).",
    goldsLabel: "10+X",
    xnineLabel: "X",
    isBuiltIn: true,
    defaultSessions: [
      { sessionNum: 1, name: "Day 1 - Open 70m Recurve & 50m Compound Qualification", stage: "QUALIFICATION", maxBales: 30, archersPerBale: 4 },
      { sessionNum: 2, name: "Day 2 - Open 30m Recurve & Short Metric Qualification", stage: "QUALIFICATION", maxBales: 30, archersPerBale: 4 },
      { sessionNum: 3, name: "Day 3 - Individual & Team Eliminations", stage: "ELIMINATION", maxBales: 16, archersPerBale: 2 },
    ],
    divisions: [
      { code: "R", name: "Recurve", sortOrder: 1 },
      { code: "C", name: "Compound", sortOrder: 2 },
    ],
    ageClasses: [
      { code: "OPEN_M", name: "Open Men", gender: "M", validShootUpClasses: [], sortOrder: 1 },
      { code: "OPEN_W", name: "Open Women", gender: "W", validShootUpClasses: [], sortOrder: 2 },
      { code: "NOV30_M", name: "Open 30m Novices Men", gender: "M", validShootUpClasses: ["SHORT_M", "OPEN_M"], sortOrder: 3 },
      { code: "NOV30_W", name: "Open 30m Novices Women", gender: "W", validShootUpClasses: ["SHORT_W", "OPEN_W"], sortOrder: 4 },
      { code: "SHORT_M", name: "Short Recurve Metric Men", gender: "M", validShootUpClasses: ["OPEN_M"], sortOrder: 5 },
      { code: "SHORT_W", name: "Short Recurve Metric Women", gender: "W", validShootUpClasses: ["OPEN_W"], sortOrder: 6 },
    ],
    distanceMatrix: [
      // Open 70m Recurve Men & Women (36x2, 122cm — Selection Trial Cut-off: M 630, W 600)
      {
        divisionCodes: ["R"],
        ageClassCodes: ["OPEN_M", "OPEN_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 70, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 70, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      // Open 50m Compound Men & Women (36x2, 80cm 6-ring — Selection Trial Cut-off: M 660, W 650)
      {
        divisionCodes: ["C"],
        ageClassCodes: ["OPEN_M", "OPEN_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 50, targetFaceCode: "FACE_80_6RING", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 50, targetFaceCode: "FACE_80_6RING", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      // Open 30m Recurve Novices Men & Women (bow sharing permitted, 80cm full face)
      {
        divisionCodes: ["R"],
        ageClassCodes: ["NOV30_M", "NOV30_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 30, targetFaceCode: "FACE_80_FULL", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 30, targetFaceCode: "FACE_80_FULL", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      // Short Recurve Metric Men & Women (50m + 30m, 80cm full face)
      {
        divisionCodes: ["R"],
        ageClassCodes: ["SHORT_M", "SHORT_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 50, targetFaceCode: "FACE_80_FULL", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 30, targetFaceCode: "FACE_80_FULL", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
    ],
  },

  SL_JUNIOR_NATIONALS: {
    code: "SL_JUNIOR_NATIONALS",
    name: "Sri Lanka Archery Junior Nationals (SLAA JNAC)",
    description:
      "SLAA Junior National Archery Championship: U21 (70m/30m), U18 (60m/30m), Under 14 (18m on 80cm), Under 12 (18m on 122cm), and Under 10 (10m on 122cm).",
    goldsLabel: "10+X",
    xnineLabel: "X",
    isBuiltIn: true,
    defaultSessions: [
      { sessionNum: 1, name: "Day 1 - U21 70m & U18 60m Qualification", stage: "QUALIFICATION", maxBales: 30, archersPerBale: 4 },
      { sessionNum: 2, name: "Day 2 - U21/U18 30m, U14, U12 & U10 Ranking", stage: "QUALIFICATION", maxBales: 30, archersPerBale: 4 },
      { sessionNum: 3, name: "Day 3 - Individual, Team & Mixed Team Eliminations", stage: "ELIMINATION", maxBales: 16, archersPerBale: 2 },
    ],
    divisions: [
      { code: "R", name: "Recurve", sortOrder: 1 },
    ],
    ageClasses: [
      { code: "U10_M", name: "Under 10 Boys (10m)", gender: "M", maxAge: 9, validShootUpClasses: ["U12_M", "U14_M"], sortOrder: 1 },
      { code: "U10_W", name: "Under 10 Girls (10m)", gender: "W", maxAge: 9, validShootUpClasses: ["U12_W", "U14_W"], sortOrder: 2 },
      { code: "U12_M", name: "Under 12 Boys (18m)", gender: "M", maxAge: 11, validShootUpClasses: ["U14_M", "U18_30M_M", "U18_M"], sortOrder: 3 },
      { code: "U12_W", name: "Under 12 Girls (18m)", gender: "W", maxAge: 11, validShootUpClasses: ["U14_W", "U18_30M_W", "U18_W"], sortOrder: 4 },
      { code: "U14_M", name: "Under 14 Boys (18m)", gender: "M", maxAge: 13, validShootUpClasses: ["U18_30M_M", "U18_M", "U21_30M_M", "U21_M"], sortOrder: 5 },
      { code: "U14_W", name: "Under 14 Girls (18m)", gender: "W", maxAge: 13, validShootUpClasses: ["U18_30M_W", "U18_W", "U21_30M_W", "U21_W"], sortOrder: 6 },
      { code: "U18_30M_M", name: "U18 Boys 30m Ranking", gender: "M", maxAge: 17, validShootUpClasses: ["U18_M", "U21_30M_M", "U21_M"], sortOrder: 7 },
      { code: "U18_30M_W", name: "U18 Girls 30m Ranking", gender: "W", maxAge: 17, validShootUpClasses: ["U18_W", "U21_30M_W", "U21_W"], sortOrder: 8 },
      { code: "U18_M", name: "U18 Boys 60m", gender: "M", maxAge: 17, validShootUpClasses: ["U21_M"], sortOrder: 9 },
      { code: "U18_W", name: "U18 Girls 60m", gender: "W", maxAge: 17, validShootUpClasses: ["U21_W"], sortOrder: 10 },
      { code: "U21_30M_M", name: "U21 Boys 30m Ranking", gender: "M", maxAge: 20, validShootUpClasses: ["U21_M"], sortOrder: 11 },
      { code: "U21_30M_W", name: "U21 Girls 30m Ranking", gender: "W", maxAge: 20, validShootUpClasses: ["U21_W"], sortOrder: 12 },
      { code: "U21_M", name: "U21 Boys 70m", gender: "M", maxAge: 20, validShootUpClasses: [], sortOrder: 13 },
      { code: "U21_W", name: "U21 Girls 70m", gender: "W", maxAge: 20, validShootUpClasses: [], sortOrder: 14 },
    ],
    distanceMatrix: [
      // U21 70m Boys & Girls -> 122cm, 70m
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U21_M", "U21_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 70, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 70, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      // U18 60m Boys & Girls -> 122cm, 60m
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U18_M", "U18_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 60, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 60, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      // U21 30m & U18 30m -> 80cm, 30m
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U21_30M_M", "U21_30M_W", "U18_30M_M", "U18_30M_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 30, targetFaceCode: "FACE_80_FULL", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 30, targetFaceCode: "FACE_80_FULL", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      // Under 14 Boys & Girls -> 80cm, 18m
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U14_M", "U14_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 18, targetFaceCode: "FACE_80_FULL", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 18, targetFaceCode: "FACE_80_FULL", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      // Under 12 Boys & Girls -> 122cm, 18m
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U12_M", "U12_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 18, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 18, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      // Under 10 Boys & Girls -> 122cm, 10m
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U10_M", "U10_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 10, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 10, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
    ],
  },

  WA_720: {
    code: "WA_720",
    name: "World Archery 720 Round (Outdoor)",
    description: "Standard 72-arrow outdoor ranking round (Recurve 70m/60m, Compound 50m 6-ring, Barebow 50m).",
    goldsLabel: "10+X",
    xnineLabel: "X",
    isBuiltIn: true,
    defaultSessions: [
      { sessionNum: 1, name: "Qualification - Session 1 (Morning)", stage: "QUALIFICATION", maxBales: 24, archersPerBale: 4 },
      { sessionNum: 2, name: "Qualification - Session 2 (Afternoon)", stage: "QUALIFICATION", maxBales: 24, archersPerBale: 4 },
    ],
    divisions: [
      { code: "R", name: "Recurve", sortOrder: 1 },
      { code: "C", name: "Compound", sortOrder: 2 },
      { code: "B", name: "Barebow", sortOrder: 3 },
    ],
    ageClasses: STANDARD_AGE_CLASSES,
    distanceMatrix: [
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U21M", "U21W", "OPEN_M", "OPEN_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 70, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 70, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U18M", "U18W", "50+M", "50+W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 60, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 60, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U15M", "U15W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 40, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 40, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      {
        divisionCodes: ["C"],
        ageClassCodes: STANDARD_AGE_CLASSES.map((c) => c.code),
        distances: [
          { distanceNumber: 1, distanceMeters: 50, targetFaceCode: "FACE_80_6RING", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 50, targetFaceCode: "FACE_80_6RING", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      {
        divisionCodes: ["B"],
        ageClassCodes: STANDARD_AGE_CLASSES.map((c) => c.code),
        distances: [
          { distanceNumber: 1, distanceMeters: 50, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 50, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
    ],
  },

  WA_INDOOR_18M: {
    code: "WA_INDOOR_18M",
    name: "World Archery Indoor 18m (600 Round)",
    description: "60-arrow indoor round (2x30 arrows at 18m on 40cm triple-spot or full face).",
    goldsLabel: "10",
    xnineLabel: "9",
    isBuiltIn: true,
    defaultSessions: [
      { sessionNum: 1, name: "Indoor Line A", stage: "QUALIFICATION", maxBales: 20, archersPerBale: 4 },
      { sessionNum: 2, name: "Indoor Line B", stage: "QUALIFICATION", maxBales: 20, archersPerBale: 4 },
    ],
    divisions: [
      { code: "R", name: "Recurve", sortOrder: 1 },
      { code: "C", name: "Compound", sortOrder: 2 },
      { code: "B", name: "Barebow", sortOrder: 3 },
    ],
    ageClasses: STANDARD_AGE_CLASSES,
    distanceMatrix: [
      {
        divisionCodes: ["R", "C"],
        ageClassCodes: STANDARD_AGE_CLASSES.map((c) => c.code),
        distances: [
          { distanceNumber: 1, distanceMeters: 18, targetFaceCode: "FACE_40_TRIPLE", endsCount: 10, arrowsPerEnd: 3, maxScore: 300 },
          { distanceNumber: 2, distanceMeters: 18, targetFaceCode: "FACE_40_TRIPLE", endsCount: 10, arrowsPerEnd: 3, maxScore: 300 },
        ],
      },
      {
        divisionCodes: ["B"],
        ageClassCodes: STANDARD_AGE_CLASSES.map((c) => c.code),
        distances: [
          { distanceNumber: 1, distanceMeters: 18, targetFaceCode: "FACE_40_FULL", endsCount: 10, arrowsPerEnd: 3, maxScore: 300 },
          { distanceNumber: 2, distanceMeters: 18, targetFaceCode: "FACE_40_FULL", endsCount: 10, arrowsPerEnd: 3, maxScore: 300 },
        ],
      },
    ],
  },

  WA_1440: {
    code: "WA_1440",
    name: "World Archery 1440 Round (4 Distances)",
    description: "Classic 144-arrow four-distance outdoor round (90/70/50/30m Men, 70/60/50/30m Women).",
    goldsLabel: "10+X",
    xnineLabel: "X",
    isBuiltIn: true,
    defaultSessions: [
      { sessionNum: 1, name: "1440 Qualification Line", stage: "QUALIFICATION", maxBales: 24, archersPerBale: 4 },
    ],
    divisions: [
      { code: "R", name: "Recurve", sortOrder: 1 },
      { code: "C", name: "Compound", sortOrder: 2 },
    ],
    ageClasses: [
      { code: "OPEN_M", name: "Senior Men", gender: "M", validShootUpClasses: [], sortOrder: 1 },
      { code: "OPEN_W", name: "Senior Women", gender: "W", validShootUpClasses: [], sortOrder: 2 },
    ],
    distanceMatrix: [
      {
        divisionCodes: ["R", "C"],
        ageClassCodes: ["OPEN_M"],
        distances: [
          { distanceNumber: 1, distanceMeters: 90, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 70, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 3, distanceMeters: 50, targetFaceCode: "FACE_80_FULL", endsCount: 12, arrowsPerEnd: 3, maxScore: 360 },
          { distanceNumber: 4, distanceMeters: 30, targetFaceCode: "FACE_80_FULL", endsCount: 12, arrowsPerEnd: 3, maxScore: 360 },
        ],
      },
      {
        divisionCodes: ["R", "C"],
        ageClassCodes: ["OPEN_W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 70, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 60, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 3, distanceMeters: 50, targetFaceCode: "FACE_80_FULL", endsCount: 12, arrowsPerEnd: 3, maxScore: 360 },
          { distanceNumber: 4, distanceMeters: 30, targetFaceCode: "FACE_80_FULL", endsCount: 12, arrowsPerEnd: 3, maxScore: 360 },
        ],
      },
    ],
  },

  USA_JOAD: {
    code: "USA_JOAD",
    name: "USA Archery JOAD Outdoor",
    description: "Youth outdoor round with Bowman/Cub/Cadet/Junior shoot-up progression.",
    goldsLabel: "10+X",
    xnineLabel: "X",
    isBuiltIn: true,
    defaultSessions: [
      { sessionNum: 1, name: "JOAD Morning Flight", stage: "QUALIFICATION", maxBales: 24, archersPerBale: 4 },
    ],
    divisions: [
      { code: "R", name: "Recurve", sortOrder: 1 },
      { code: "C", name: "Compound", sortOrder: 2 },
      { code: "B", name: "Barebow", sortOrder: 3 },
    ],
    ageClasses: [
      { code: "U13M", name: "Bowman Men (U13)", gender: "M", maxAge: 12, validShootUpClasses: ["U15M", "U18M", "U21M"], sortOrder: 1 },
      { code: "U13W", name: "Bowman Women (U13)", gender: "W", maxAge: 12, validShootUpClasses: ["U15W", "U18W", "U21W"], sortOrder: 2 },
      { code: "U15M", name: "Cub Men (U15)", gender: "M", maxAge: 14, validShootUpClasses: ["U18M", "U21M"], sortOrder: 3 },
      { code: "U15W", name: "Cub Women (U15)", gender: "W", maxAge: 14, validShootUpClasses: ["U18W", "U21W"], sortOrder: 4 },
      { code: "U18M", name: "Cadet Men (U18)", gender: "M", maxAge: 17, validShootUpClasses: ["U21M"], sortOrder: 5 },
      { code: "U18W", name: "Cadet Women (U18)", gender: "W", maxAge: 17, validShootUpClasses: ["U21W"], sortOrder: 6 },
      { code: "U21M", name: "Junior Men (U21)", gender: "M", maxAge: 20, validShootUpClasses: [], sortOrder: 7 },
      { code: "U21W", name: "Junior Women (U21)", gender: "W", maxAge: 20, validShootUpClasses: [], sortOrder: 8 },
    ],
    distanceMatrix: [
      {
        divisionCodes: ["R", "B"],
        ageClassCodes: ["U13M", "U13W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 30, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 30, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      {
        divisionCodes: ["R", "B"],
        ageClassCodes: ["U15M", "U15W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 50, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 50, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U18M", "U18W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 60, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 60, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      {
        divisionCodes: ["R"],
        ageClassCodes: ["U21M", "U21W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 70, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 70, targetFaceCode: "FACE_122", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
      {
        divisionCodes: ["C"],
        ageClassCodes: ["U13M", "U13W", "U15M", "U15W", "U18M", "U18W", "U21M", "U21W"],
        distances: [
          { distanceNumber: 1, distanceMeters: 50, targetFaceCode: "FACE_80_6RING", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
          { distanceNumber: 2, distanceMeters: 50, targetFaceCode: "FACE_80_6RING", endsCount: 6, arrowsPerEnd: 6, maxScore: 360 },
        ],
      },
    ],
  },
};

export const BUILT_IN_RULESETS: RulesetPreset[] = Object.values(RULESET_PRESETS);
