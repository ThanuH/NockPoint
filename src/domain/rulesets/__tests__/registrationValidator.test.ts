import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateCompetitionAge,
  resolveNaturalAgeClass,
  doDistanceRulesMatch,
  validateRegistrationRequest,
  type AgeClassRule,
  type DistanceRuleSpec,
} from "../registrationValidator";

const AGE_CLASSES: AgeClassRule[] = [
  { code: "U18M", name: "Under 18 Men", gender: "M", minAge: 15, maxAge: 17, validShootUpClasses: ["U21M", "OPEN_M"] },
  { code: "U21M", name: "Under 21 Men", gender: "M", minAge: 18, maxAge: 20, validShootUpClasses: ["OPEN_M"] },
  { code: "OPEN_M", name: "Senior Men", gender: "M", minAge: null, maxAge: null, validShootUpClasses: [] },
  { code: "U18W", name: "Under 18 Women", gender: "W", minAge: 15, maxAge: 17, validShootUpClasses: ["U21W", "OPEN_W"] },
];

const DISTANCE_RULES: DistanceRuleSpec[] = [
  // Recurve U18M -> 60m
  { divisionCode: "R", ageClassCode: "U18M", distanceNumber: 1, distanceMeters: 60, targetFaceId: "face122", endsCount: 6, arrowsPerEnd: 6 },
  { divisionCode: "R", ageClassCode: "U18M", distanceNumber: 2, distanceMeters: 60, targetFaceId: "face122", endsCount: 6, arrowsPerEnd: 6 },
  // Recurve U21M -> 70m
  { divisionCode: "R", ageClassCode: "U21M", distanceNumber: 1, distanceMeters: 70, targetFaceId: "face122", endsCount: 6, arrowsPerEnd: 6 },
  { divisionCode: "R", ageClassCode: "U21M", distanceNumber: 2, distanceMeters: 70, targetFaceId: "face122", endsCount: 6, arrowsPerEnd: 6 },
  // Recurve OPEN_M -> 70m (matches U21M!)
  { divisionCode: "R", ageClassCode: "OPEN_M", distanceNumber: 1, distanceMeters: 70, targetFaceId: "face122", endsCount: 6, arrowsPerEnd: 6 },
  { divisionCode: "R", ageClassCode: "OPEN_M", distanceNumber: 2, distanceMeters: 70, targetFaceId: "face122", endsCount: 6, arrowsPerEnd: 6 },
];

const COMP_DATE = new Date("2026-09-19");

test("resolves natural age class for a 2009-born male archer in 2026 as U18M", () => {
  const age = calculateCompetitionAge(new Date("2009-05-10"), COMP_DATE);
  assert.equal(age, 17);
  const natural = resolveNaturalAgeClass(age, "M", AGE_CLASSES);
  assert.equal(natural?.code, "U18M");
});

test("doDistanceRulesMatch returns true for U21M & OPEN_M (both 70m) and false for U18M (60m) vs U21M (70m)", () => {
  assert.equal(doDistanceRulesMatch("R", "U21M", "R", "OPEN_M", DISTANCE_RULES), true);
  assert.equal(doDistanceRulesMatch("R", "U18M", "R", "U21M", DISTANCE_RULES), false);
});

test("SHARED_SCORE allows U21M + OPEN_M on the same 70m slot", () => {
  const res = validateRegistrationRequest({
    tournamentIsLocked: false,
    multiClassMode: "BOTH",
    modeRequested: "SHARED_SCORE",
    archerGender: "M",
    archerBirthDate: new Date("2007-03-15"), // age 19 -> U21M
    competitionDate: COMP_DATE,
    targetDivisionCode: "R",
    targetClassCode: "OPEN_M",
    targetRegistrationId: "reg-1",
    existingSlots: [
      {
        id: "reg-1",
        sessionId: "ses-1",
        divisionCode: "R",
        primaryClassCode: "U21M",
        enrolledCategories: [{ divisionCode: "R", classCode: "U21M" }],
      },
    ],
    ageClasses: AGE_CLASSES,
    distanceRules: DISTANCE_RULES,
  });
  assert.equal(res.valid, true);
});

test("SHARED_SCORE rejects U18M (60m) sharing score with U21M (70m) and suggests SEPARATE_SESSIONS", () => {
  const res = validateRegistrationRequest({
    tournamentIsLocked: false,
    multiClassMode: "BOTH",
    modeRequested: "SHARED_SCORE",
    archerGender: "M",
    archerBirthDate: new Date("2009-05-10"), // age 17 -> U18M
    competitionDate: COMP_DATE,
    targetDivisionCode: "R",
    targetClassCode: "U21M",
    targetRegistrationId: "reg-1",
    existingSlots: [
      {
        id: "reg-1",
        sessionId: "ses-1",
        divisionCode: "R",
        primaryClassCode: "U18M",
        enrolledCategories: [{ divisionCode: "R", classCode: "U18M" }],
      },
    ],
    ageClasses: AGE_CLASSES,
    distanceRules: DISTANCE_RULES,
  });
  assert.equal(res.valid, false);
  assert.equal(res.suggestedMode, "SEPARATE_SESSIONS");
});

test("SEPARATE_SESSIONS allows U18M in Session 1 + U21M in Session 2, and blocks same-session collision", () => {
  const existingSlots = [
    {
      id: "reg-1",
      sessionId: "ses-1",
      divisionCode: "R",
      primaryClassCode: "U18M",
      enrolledCategories: [{ divisionCode: "R", classCode: "U18M" }],
    },
  ];

  // Same session -> collision blocked
  const collision = validateRegistrationRequest({
    tournamentIsLocked: false,
    multiClassMode: "BOTH",
    modeRequested: "NEW_SLOT",
    archerGender: "M",
    archerBirthDate: new Date("2009-05-10"),
    competitionDate: COMP_DATE,
    targetDivisionCode: "R",
    targetClassCode: "U21M",
    targetSessionId: "ses-1",
    existingSlots,
    ageClasses: AGE_CLASSES,
    distanceRules: DISTANCE_RULES,
  });
  assert.equal(collision.valid, false);
  assert.match(collision.reason ?? "", /collision/i);

  // Different session -> allowed
  const ok = validateRegistrationRequest({
    tournamentIsLocked: false,
    multiClassMode: "BOTH",
    modeRequested: "NEW_SLOT",
    archerGender: "M",
    archerBirthDate: new Date("2009-05-10"),
    competitionDate: COMP_DATE,
    targetDivisionCode: "R",
    targetClassCode: "U21M",
    targetSessionId: "ses-2",
    existingSlots,
    ageClasses: AGE_CLASSES,
    distanceRules: DISTANCE_RULES,
  });
  assert.equal(ok.valid, true);
});

test("SINGLE_STRICT blocks any second category, and Senior archer cannot shoot down into U18M", () => {
  const strict = validateRegistrationRequest({
    tournamentIsLocked: false,
    multiClassMode: "SINGLE_STRICT",
    modeRequested: "NEW_SLOT",
    archerGender: "M",
    archerBirthDate: new Date("2009-05-10"),
    competitionDate: COMP_DATE,
    targetDivisionCode: "R",
    targetClassCode: "U21M",
    targetSessionId: "ses-2",
    existingSlots: [
      {
        id: "reg-1",
        sessionId: "ses-1",
        divisionCode: "R",
        primaryClassCode: "U18M",
        enrolledCategories: [{ divisionCode: "R", classCode: "U18M" }],
      },
    ],
    ageClasses: AGE_CLASSES,
    distanceRules: DISTANCE_RULES,
  });
  assert.equal(strict.valid, false);

  const shootDown = validateRegistrationRequest({
    tournamentIsLocked: false,
    multiClassMode: "BOTH",
    modeRequested: "NEW_SLOT",
    archerGender: "M",
    archerBirthDate: new Date("1999-01-01"), // age 27 -> OPEN_M
    competitionDate: COMP_DATE,
    targetDivisionCode: "R",
    targetClassCode: "U18M",
    targetSessionId: "ses-1",
    existingSlots: [],
    ageClasses: AGE_CLASSES,
    distanceRules: DISTANCE_RULES,
  });
  assert.equal(shootDown.valid, false);
});
