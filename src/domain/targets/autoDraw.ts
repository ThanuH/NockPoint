export interface DrawCandidate {
  registrationId: string;
  archerId: string;
  clubCode: string;
  divisionCode: string;
  primaryClassCode: string;
  distanceKey: string; // e.g. "70m-FACE_122" so same-distance/face archers share bales
  bowSharingGroup?: string | null;
}

export interface TargetAssignmentResult {
  registrationId: string;
  baleNumber: number;
  targetLetter: string;
  targetNoFormatted: string; // e.g. "1001A"
}

export interface AutoDrawOutput {
  assignments: TargetAssignmentResult[];
  unassignedIds: string[];
  balesUsed: number;
  warnings: string[];
}

const TARGET_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function formatTargetNo(sessionNum: number, baleNumber: number, targetLetter: string): string {
  return `${sessionNum}${String(baleNumber).padStart(3, "0")}${targetLetter.toUpperCase()}`;
}

/**
 * Interleaves candidates by club (largest clubs distributed evenly across bales)
 * so teammates from the same club are separated onto different targets whenever possible.
 */
function interleaveByClub(candidates: DrawCandidate[]): DrawCandidate[] {
  const byClub = new Map<string, DrawCandidate[]>();
  for (const c of candidates) {
    const key = c.clubCode || "IND";
    const list = byClub.get(key) ?? [];
    list.push(c);
    byClub.set(key, list);
  }

  // Sort clubs by size descending so large clubs spread first
  const clubQueues = Array.from(byClub.values()).sort((a, b) => b.length - a.length);
  const result: DrawCandidate[] = [];

  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const queue of clubQueues) {
      const next = queue.shift();
      if (next) {
        result.push(next);
        remaining = true;
      }
    }
  }

  return result;
}

/**
 * Automated Target Draw:
 *  1. Groups archers by `distanceKey` (distance + target face) so each bale has one uniform distance/face.
 *  2. Within each group, interleaves archers by club to separate teammates.
 *  3. Assigns bale numbers starting from `startBale`, filling positions across bales first (all A's, then B's,
 *     then C's, then D's) so same-club teammates are maximally separated onto different bales.
 */
export function computeAutoDraw(params: {
  sessionNum: number;
  maxBales: number;
  archersPerBale: number;
  startBale?: number;
  candidates: DrawCandidate[];
}): AutoDrawOutput {
  const { sessionNum, maxBales, archersPerBale, candidates } = params;
  const startBale = Math.max(1, params.startBale ?? 1);
  const letters = TARGET_LETTERS.slice(0, Math.max(1, Math.min(archersPerBale, TARGET_LETTERS.length)));

  const assignments: TargetAssignmentResult[] = [];
  const unassignedIds: string[] = [];
  const warnings: string[] = [];

  if (candidates.length === 0) {
    return { assignments, unassignedIds, balesUsed: 0, warnings };
  }

  // Group by distance + target face (sorted descending by distance so longest distances start at Bale 1)
  const groups = new Map<string, DrawCandidate[]>();
  for (const c of candidates) {
    const list = groups.get(c.distanceKey) ?? [];
    list.push(c);
    groups.set(c.distanceKey, list);
  }

  const sortedGroupKeys = Array.from(groups.keys()).sort((a, b) => {
    const numA = parseFloat(a) || 0;
    const numB = parseFloat(b) || 0;
    return numB - numA || a.localeCompare(b);
  });

  let currentBale = startBale;

  for (const groupKey of sortedGroupKeys) {
    const groupCandidates = interleaveByClub(groups.get(groupKey) ?? []);
    const balesNeeded = Math.ceil(groupCandidates.length / letters.length);
    const availableBales = Math.max(0, maxBales - currentBale + 1);

    if (availableBales === 0) {
      for (const c of groupCandidates) unassignedIds.push(c.registrationId);
      warnings.push(`No bales remaining for group ${groupKey} (${groupCandidates.length} archers unassigned).`);
      continue;
    }

    const allocatedBales = Math.min(balesNeeded, availableBales);
    const maxCapacityForGroup = allocatedBales * letters.length;

    // Distribute across bales column-first (Bale 1A, Bale 2A, ..., Bale 1B, Bale 2B...)
    // This guarantees maximum club separation across bales!
    const slots: { bale: number; letter: string }[] = [];
    for (const letter of letters) {
      for (let b = 0; b < allocatedBales; b++) {
        slots.push({ bale: currentBale + b, letter });
      }
    }

    groupCandidates.forEach((cand, idx) => {
      if (idx >= maxCapacityForGroup) {
        unassignedIds.push(cand.registrationId);
        return;
      }
      const slot = slots[idx];
      assignments.push({
        registrationId: cand.registrationId,
        baleNumber: slot.bale,
        targetLetter: slot.letter,
        targetNoFormatted: formatTargetNo(sessionNum, slot.bale, slot.letter),
      });
    });

    if (groupCandidates.length > maxCapacityForGroup) {
      warnings.push(
        `Session capacity exceeded in group ${groupKey}: ${groupCandidates.length - maxCapacityForGroup} archer(s) could not be assigned.`
      );
    }

    currentBale += allocatedBales;
  }

  // Sort final assignments by baleNumber, then targetLetter
  assignments.sort((a, b) => a.baleNumber - b.baleNumber || a.targetLetter.localeCompare(b.targetLetter));

  return {
    assignments,
    unassignedIds,
    balesUsed: Math.max(0, currentBale - startBale),
    warnings,
  };
}
