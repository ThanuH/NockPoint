export interface ParsedParticipantRow {
  lineNumber: number;
  bibCode: string;
  firstName: string;
  lastName: string;
  gender: "M" | "W" | "X";
  birthDate: string | null; // YYYY-MM-DD
  clubCode: string;
  clubName: string;
  divisionCode: string;
  primaryClassCode: string;
  secondaryClassCodes: string[];
  sessionNum: number | null;
  baleNumber: number | null;
  targetLetter: string | null;
  email?: string | null;
  bowSharingGroup?: string | null;
}

export interface ImportParseResult {
  formatDetected: "IANSEO_TSV" | "EVENTBOOKING_CSV" | "COGNITO_CSV" | "NOCKPOINT_CSV";
  rows: ParsedParticipantRow[];
  warnings: string[];
}

export function normalizeLineEndings(raw: string): string {
  return raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function normalizeGender(raw: string | undefined): "M" | "W" | "X" {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "F" || v === "W" || v === "FEMALE" || v === "WOMEN" || v === "WOMAN" || v === "GIRL" || v === "GIRLS" || v === "1") {
    return "W";
  }
  if (v === "M" || v === "MALE" || v === "MEN" || v === "MAN" || v === "BOY" || v === "BOYS" || v === "0") {
    return "M";
  }
  return "X";
}

export function normalizeDate(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v || v === "0000-00-00") return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // DD/MM/YYYY or MM/DD/YYYY -> prefer YYYY-MM-DD if parseable
  const slashMatch = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;
    const day = Number(a) > 12 ? a.padStart(2, "0") : b.padStart(2, "0");
    const month = Number(a) > 12 ? b.padStart(2, "0") : a.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Parses legacy 21-column Ianseo `.tab` (TSV) files.
 * Standard Ianseo 21-column order:
 *  0: Bib (EnCode)
 *  1: Session (QuSession)
 *  2: Division (EnDivision)
 *  3: Class (EnClass)
 *  4: Target (e.g. "005A" or "5A")
 *  5: Individual Qualifying (1/0)
 *  6: Team Qualifying (1/0)
 *  7: Individual Finals (1/0)
 *  8: Team Finals (1/0)
 *  9: Mixed Team Finals (1/0)
 * 10: Last Name (EnName)
 * 11: First Name (EnFirstName)
 * 12: Gender (0=M, 1=W or M/W)
 * 13: Club/Country Code (CoCode)
 * 14: Club/Country Name (CoName)
 * 15: Date of Birth (YYYY-MM-DD)
 * 16: SubClass
 * 17: Club2 Code
 * 18: Club2 Name
 * 19: Club3 Code
 * 20: Club3 Name
 */
export function parseIanseoTsv(raw: string): ImportParseResult {
  const lines = normalizeLineEndings(raw).split("\n");
  const rows: ParsedParticipantRow[] = [];
  const warnings: string[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const cols = line.split("\t").map((c) => c.trim());
    // Skip header row if present
    if (idx === 0 && /^(bib|encode|code|id)/i.test(cols[0] ?? "")) {
      return;
    }

    if (cols.length < 12) {
      warnings.push(`Line ${idx + 1}: expected at least 12 tab-separated columns, got ${cols.length} (skipped).`);
      return;
    }

    const bibCode = cols[0] || `TSV-${idx + 1}`;
    const sessionNum = cols[1] && !Number.isNaN(Number(cols[1])) ? Number(cols[1]) : null;
    const divisionCode = (cols[2] || "R").toUpperCase();
    const primaryClassCode = (cols[3] || "OPEN_M").toUpperCase();
    const targetRaw = cols[4] || "";
    const targetMatch = targetRaw.match(/^0*(\d+)([A-Za-z])$/);
    const baleNumber = targetMatch ? Number(targetMatch[1]) : null;
    const targetLetter = targetMatch ? targetMatch[2].toUpperCase() : null;

    const lastName = cols[10] || "";
    const firstName = cols[11] || "";
    if (!firstName && !lastName) {
      warnings.push(`Line ${idx + 1}: missing athlete name (skipped).`);
      return;
    }

    const gender = normalizeGender(cols[12]);
    const clubCode = (cols[13] || "IND").toUpperCase();
    const clubName = cols[14] || clubCode;
    const birthDate = normalizeDate(cols[15]);

    rows.push({
      lineNumber: idx + 1,
      bibCode: bibCode.toUpperCase(),
      firstName: firstName || lastName,
      lastName: lastName || firstName,
      gender,
      birthDate,
      clubCode,
      clubName,
      divisionCode,
      primaryClassCode,
      secondaryClassCodes: [],
      sessionNum,
      baleNumber,
      targetLetter,
    });
  });

  return { formatDetected: "IANSEO_TSV", rows, warnings };
}

export function generateIanseoTsvTemplate(): string {
  const header = [
    "Bib",
    "Session",
    "Division",
    "Class",
    "Target",
    "IndQual",
    "TeamQual",
    "IndFin",
    "TeamFin",
    "MixFin",
    "LastName",
    "FirstName",
    "Gender",
    "ClubCode",
    "ClubName",
    "BirthDate",
    "SubClass",
    "Club2Code",
    "Club2Name",
    "Club3Code",
    "Club3Name",
  ].join("\t");

  const sample1 = [
    "SL-1001",
    "1",
    "R",
    "OPEN_M",
    "001A",
    "1",
    "1",
    "1",
    "1",
    "1",
    "PERERA",
    "Kasun",
    "M",
    "COL",
    "Colombo Archery Club",
    "1998-05-14",
    "",
    "",
    "",
    "",
    "",
  ].join("\t");

  const sample2 = [
    "SL-1002",
    "1",
    "C",
    "OPEN_W",
    "002A",
    "1",
    "1",
    "1",
    "1",
    "1",
    "SILVA",
    "Nimali",
    "W",
    "KAC",
    "Kandy Archery Club",
    "2000-09-22",
    "",
    "",
    "",
    "",
    "",
  ].join("\t");

  return `${header}\n${sample1}\n${sample2}\n`;
}
