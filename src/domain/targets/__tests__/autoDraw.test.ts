import test from "node:test";
import assert from "node:assert/strict";
import { computeAutoDraw, formatTargetNo } from "../autoDraw";

test("formatTargetNo produces standard Ianseo 5-char target codes", () => {
  assert.equal(formatTargetNo(1, 5, "a"), "1005A");
  assert.equal(formatTargetNo(2, 24, "D"), "2024D");
});

test("separates same-club teammates onto different bales", () => {
  const candidates = [
    { registrationId: "r1", archerId: "a1", clubCode: "COL", divisionCode: "R", primaryClassCode: "OPEN_M", distanceKey: "70m-FACE_122" },
    { registrationId: "r2", archerId: "a2", clubCode: "COL", divisionCode: "R", primaryClassCode: "OPEN_M", distanceKey: "70m-FACE_122" },
    { registrationId: "r3", archerId: "a3", clubCode: "KAC", divisionCode: "R", primaryClassCode: "OPEN_M", distanceKey: "70m-FACE_122" },
    { registrationId: "r4", archerId: "a4", clubCode: "KAC", divisionCode: "R", primaryClassCode: "OPEN_M", distanceKey: "70m-FACE_122" },
    { registrationId: "r5", archerId: "a5", clubCode: "SLAA", divisionCode: "R", primaryClassCode: "OPEN_M", distanceKey: "70m-FACE_122" },
    { registrationId: "r6", archerId: "a6", clubCode: "SLAA", divisionCode: "R", primaryClassCode: "OPEN_M", distanceKey: "70m-FACE_122" },
  ];

  const out = computeAutoDraw({
    sessionNum: 1,
    maxBales: 10,
    archersPerBale: 4,
    candidates,
  });

  assert.equal(out.assignments.length, 6);
  assert.equal(out.balesUsed, 2);

  // Check COL archers (r1, r2) are on different bales
  const colBales = out.assignments
    .filter((a) => a.registrationId === "r1" || a.registrationId === "r2")
    .map((a) => a.baleNumber);
  assert.notEqual(colBales[0], colBales[1]);
});

test("keeps different distances on separate bales (70m before 50m)", () => {
  const candidates = [
    { registrationId: "r70", archerId: "a1", clubCode: "COL", divisionCode: "R", primaryClassCode: "OPEN_M", distanceKey: "70m-FACE_122" },
    { registrationId: "r50", archerId: "a2", clubCode: "KAC", divisionCode: "C", primaryClassCode: "OPEN_M", distanceKey: "50m-FACE_80_6RING" },
  ];

  const out = computeAutoDraw({
    sessionNum: 1,
    maxBales: 10,
    archersPerBale: 4,
    candidates,
  });

  const a70 = out.assignments.find((a) => a.registrationId === "r70")!;
  const a50 = out.assignments.find((a) => a.registrationId === "r50")!;
  assert.equal(a70.baleNumber, 1);
  assert.equal(a50.baleNumber, 2);
  assert.equal(a70.targetNoFormatted, "1001A");
  assert.equal(a50.targetNoFormatted, "1002A");
});

test("reports capacity overflow cleanly when bales are full", () => {
  const candidates = Array.from({ length: 6 }, (_, i) => ({
    registrationId: `r${i}`,
    archerId: `a${i}`,
    clubCode: `C${i}`,
    divisionCode: "R",
    primaryClassCode: "OPEN_M",
    distanceKey: "70m-FACE_122",
  }));

  const out = computeAutoDraw({
    sessionNum: 1,
    maxBales: 1,
    archersPerBale: 4,
    candidates,
  });

  assert.equal(out.assignments.length, 4);
  assert.equal(out.unassignedIds.length, 2);
  assert.equal(out.warnings.length, 1);
});
