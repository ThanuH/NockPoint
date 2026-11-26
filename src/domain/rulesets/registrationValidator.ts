import type { MultiClassMode } from "./presets";

export interface AgeClassRule {
  code: string;
  name: string;
  gender: string; // "M" | "W" | "X"
  minAge: number | null;
  maxAge: number | null;
  validShootUpClasses: string[];
}

export interface DistanceRuleSpec {
  divisionCode: string;
  ageClassCode: string;
  distanceNumber: number;
  distanceMeters: number;
  targetFaceId: string;
  endsCount: number;
  arrowsPerEnd: number;
}

export interface ExistingRegistrationSlot {
  id: string;
  sessionId: string | null;
  divisionCode: string;
  primaryClassCode: string;
  enrolledCategories: { divisionCode: string; classCode: string }[];
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  suggestedMode?: "SHARED_SCORE" | "SEPARATE_SESSIONS";
}

/**
 * World Archery age rule: an athlete's competition age is the age they turn
 * during the calendar year of the tournament.
 */
export function calculateCompetitionAge(birthDate: Date, competitionDate: Date): number {
  return competitionDate.getUTCFullYear() - birthDate.getUTCFullYear();
}

/**
 * Determines the athlete's natural (primary) age class based on age & gender.
 * Prefers the most specific bounded age class (e.g. U18 over OPEN).
 */
export function resolveNaturalAgeClass(
  age: number | null,
  gender: string,
  ageClasses: AgeClassRule[]
): AgeClassRule | null {
  const genderMatches = ageClasses.filter((c) => c.gender === gender || c.gender === "X");
  if (genderMatches.length === 0) return null;

  if (age === null) {
    return genderMatches.find((c) => c.minAge === null && c.maxAge === null) ?? genderMatches[0];
  }

  // First try bounded youth/master classes (smallest upper bound first for youth, highest lower bound for masters)
  const boundedMatches = genderMatches
    .filter((c) => {
      const meetsMin = c.minAge === null || age >= c.minAge;
      const meetsMax = c.maxAge === null || age <= c.maxAge;
      return meetsMin && meetsMax && (c.minAge !== null || c.maxAge !== null);
    })
    .sort((a, b) => (a.maxAge ?? 999) - (b.maxAge ?? 999));

  if (boundedMatches.length > 0) return boundedMatches[0];

  // Fallback to open/unbounded senior class
  return genderMatches.find((c) => c.minAge === null && c.maxAge === null) ?? null;
}

/**
 * Checks whether an athlete with `naturalClass` is eligible to enter `targetClass`.
 * Allows:
 *  - Their exact natural class
 *  - Any class listed in `naturalClass.validShootUpClasses`
 *  - Any unbounded open class matching gender if no explicit shoot-up list is set
 */
export function isClassEligible(
  targetClass: AgeClassRule,
  naturalClass: AgeClassRule | null,
  archerGender: string
): ValidationResult {
  if (targetClass.gender !== "X" && targetClass.gender !== archerGender) {
    return {
      valid: false,
      reason: `Gender mismatch: athlete (${archerGender}) cannot enter ${targetClass.code} (${targetClass.gender}).`,
    };
  }

  if (!naturalClass) {
    return { valid: true };
  }

  if (targetClass.code === naturalClass.code) {
    return { valid: true };
  }

  if (naturalClass.validShootUpClasses.includes(targetClass.code)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Class ${naturalClass.code} is not eligible to enter ${targetClass.code}. Allowed shoot-up classes: ${
      naturalClass.validShootUpClasses.length > 0 ? naturalClass.validShootUpClasses.join(", ") : "None"
    }.`,
  };
}

/**
 * Checks whether two (division, ageClass) combinations shoot the exact same
 * distances, target faces, ends, and arrows — required for Shared-Score dual ranking.
 */
export function doDistanceRulesMatch(
  divA: string,
  clsA: string,
  divB: string,
  clsB: string,
  allDistanceRules: DistanceRuleSpec[]
): boolean {
  if (divA !== divB) return false;

  const rulesA = allDistanceRules
    .filter((r) => r.divisionCode === divA && r.ageClassCode === clsA)
    .sort((a, b) => a.distanceNumber - b.distanceNumber);

  const rulesB = allDistanceRules
    .filter((r) => r.divisionCode === divB && r.ageClassCode === clsB)
    .sort((a, b) => a.distanceNumber - b.distanceNumber);

  if (rulesA.length === 0 || rulesA.length !== rulesB.length) return false;

  return rulesA.every((a, i) => {
    const b = rulesB[i];
    return (
      a.distanceNumber === b.distanceNumber &&
      a.distanceMeters === b.distanceMeters &&
      a.targetFaceId === b.targetFaceId &&
      a.endsCount === b.endsCount &&
      a.arrowsPerEnd === b.arrowsPerEnd
    );
  });
}

/**
 * Validates attaching a new category enrollment or creating a new shooting slot
 * for an archer under the tournament's multiClassMode policy.
 */
export function validateRegistrationRequest(params: {
  tournamentIsLocked: boolean;
  multiClassMode: MultiClassMode;
  modeRequested: "NEW_SLOT" | "SHARED_SCORE";
  archerGender: string;
  archerBirthDate: Date | null;
  competitionDate: Date;
  targetDivisionCode: string;
  targetClassCode: string;
  targetSessionId?: string | null;
  targetRegistrationId?: string | null; // Required when modeRequested === "SHARED_SCORE"
  existingSlots: ExistingRegistrationSlot[];
  ageClasses: AgeClassRule[];
  distanceRules: DistanceRuleSpec[];
}): ValidationResult {
  if (params.tournamentIsLocked) {
    return { valid: false, reason: "Tournament is locked. Unlock it before modifying registrations." };
  }

  const targetClass = params.ageClasses.find((c) => c.code === params.targetClassCode);
  if (!targetClass) {
    return { valid: false, reason: `Unknown age class: ${params.targetClassCode}.` };
  }

  const age = params.archerBirthDate
    ? calculateCompetitionAge(params.archerBirthDate, params.competitionDate)
    : null;
  const naturalClass = resolveNaturalAgeClass(age, params.archerGender, params.ageClasses);

  // Check age/gender shoot-up eligibility
  const eligibility = isClassEligible(targetClass, naturalClass, params.archerGender);
  if (!eligibility.valid) {
    return eligibility;
  }

  // Prevent duplicate enrollment in the exact same (division, class)
  const alreadyInCategory = params.existingSlots.some((slot) =>
    slot.enrolledCategories.some(
      (cat) =>
        cat.divisionCode === params.targetDivisionCode && cat.classCode === params.targetClassCode
    )
  );
  if (alreadyInCategory) {
    return {
      valid: false,
      reason: `Archer is already enrolled in ${params.targetDivisionCode} / ${params.targetClassCode}.`,
    };
  }

  // First-ever registration for this archer in the tournament is always allowed (as NEW_SLOT)
  if (params.existingSlots.length === 0) {
    if (params.modeRequested === "SHARED_SCORE") {
      return {
        valid: false,
        reason: "Cannot attach a shared-score category before the archer has a primary shooting slot.",
      };
    }
    return { valid: true };
  }

  // Multi-class checks (archer already has >= 1 registration in this tournament)
  if (params.multiClassMode === "SINGLE_STRICT") {
    return {
      valid: false,
      reason:
        "This tournament is set to SINGLE_STRICT mode (1 archer = 1 category). Change the Multi-Class Policy in Competition Setup to allow multiple categories.",
    };
  }

  if (params.modeRequested === "SHARED_SCORE") {
    if (params.multiClassMode === "SEPARATE_SESSIONS") {
      return {
        valid: false,
        reason:
          "Shared-score dual ranking is disabled for this tournament (SEPARATE_SESSIONS mode). Register the archer in a separate session instead.",
        suggestedMode: "SEPARATE_SESSIONS",
      };
    }

    const baseSlot = params.existingSlots.find((s) => s.id === params.targetRegistrationId);
    if (!baseSlot) {
      return { valid: false, reason: "Base shooting registration slot not found for shared-score link." };
    }

    const distancesMatch = doDistanceRulesMatch(
      baseSlot.divisionCode,
      baseSlot.primaryClassCode,
      params.targetDivisionCode,
      params.targetClassCode,
      params.distanceRules
    );

    if (!distancesMatch) {
      return {
        valid: false,
        reason: `Cannot share score between ${baseSlot.divisionCode}/${baseSlot.primaryClassCode} and ${params.targetDivisionCode}/${params.targetClassCode} because their distances, bow division, or target faces do not match. Use Separate Sessions instead.`,
        suggestedMode: "SEPARATE_SESSIONS",
      };
    }

    return { valid: true };
  }

  // modeRequested === "NEW_SLOT" (2nd shooting session)
  if (params.multiClassMode === "SHARED_SCORE") {
    return {
      valid: false,
      reason:
        "Separate-session entries are disabled for this tournament (SHARED_SCORE mode only). Attach the category as a Shared Score instead.",
      suggestedMode: "SHARED_SCORE",
    };
  }

  // Session collision check
  if (params.targetSessionId) {
    const collides = params.existingSlots.some((s) => s.sessionId === params.targetSessionId);
    if (collides) {
      return {
        valid: false,
        reason:
          "Shooting sequence collision: this archer is already assigned to a target in the selected session. Pick a different session.",
      };
    }
  }

  return { valid: true };
}
