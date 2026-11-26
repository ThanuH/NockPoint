import {
  ImportParseResult,
  ParsedParticipantRow,
  normalizeDate,
  normalizeGender,
  normalizeLineEndings,
  parseIanseoTsv,
} from "./tsvImporter";

/**
 * RFC-4180 compliant CSV line parser supporting quoted fields & escaped quotes.
 */
export function parseCsvMatrix(raw: string): string[][] {
  const text = normalizeLineEndings(raw);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell.trim());
        cell = "";
      } else if (ch === "\n") {
        row.push(cell.trim());
        if (row.some((c) => c.length > 0)) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) rows.push(row);
  }

  return rows;
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const cand of candidates) {
    const cNorm = cand.toLowerCase().replace(/[^a-z0-9]/g, "");
    const idx = normalized.findIndex((h) => h === cNorm || h.includes(cNorm));
    if (idx !== -1) return idx;
  }
  return -1;
}

function mapDivisionCode(raw: string | undefined): string {
  const v = (raw ?? "").trim().toUpperCase();
  if (!v) return "R";
  if (v === "R" || v.includes("RECURVE")) return "R";
  if (v === "C" || v.includes("COMPOUND")) return "C";
  if (v === "B" || v.includes("BAREBOW")) return "B";
  if (v === "L" || v.includes("LONGBOW")) return "L";
  if (v === "T" || v.includes("TRAD")) return "T";
  return v.slice(0, 4);
}

/**
 * Parses Joomla EventBooking CSV, Cognito Forms CSV, or NockPoint standard CSV.
 */
export function parseParticipantCsv(
  raw: string,
  hint: "AUTO" | "EVENTBOOKING_CSV" | "COGNITO_CSV" | "NOCKPOINT_CSV" = "AUTO"
): ImportParseResult {
  const matrix = parseCsvMatrix(raw);
  if (matrix.length < 2) {
    return {
      formatDetected: hint === "AUTO" ? "NOCKPOINT_CSV" : hint,
      rows: [],
      warnings: ["CSV file contains no data rows."],
    };
  }

  const headers = matrix[0];
  const headerJoined = headers.join(" ").toLowerCase();

  let formatDetected: ImportParseResult["formatDetected"] = "NOCKPOINT_CSV";
  if (hint !== "AUTO") {
    formatDetected = hint;
  } else if (headerJoined.includes("registrant") || headerJoined.includes("eventbooking") || headerJoined.includes("eb_")) {
    formatDetected = "EVENTBOOKING_CSV";
  } else if (headerJoined.includes("entry_number") || headerJoined.includes("name_first") || headerJoined.includes("cognito")) {
    formatDetected = "COGNITO_CSV";
  }

  const idxBib = findColumn(headers, ["bibcode", "bib", "archerid", "license", "membershipid", "entrynumber", "id"]);
  const idxFirst = findColumn(headers, ["firstname", "namefirst", "first", "givenname"]);
  const idxLast = findColumn(headers, ["lastname", "namelast", "last", "surname", "familyname"]);
  const idxFullName = findColumn(headers, ["fullname", "archername", "competitorname", "name"]);
  const idxGender = findColumn(headers, ["gender", "sex"]);
  const idxDob = findColumn(headers, ["birthdate", "dob", "dateofbirth"]);
  const idxClubCode = findColumn(headers, ["clubcode", "countrycode", "teamcode", "orgcode"]);
  const idxClubName = findColumn(headers, ["clubname", "club", "organization", "country", "school"]);
  const idxDivision = findColumn(headers, ["divisioncode", "division", "bowtype", "bowstyle", "bow"]);
  const idxClass = findColumn(headers, ["primaryclasscode", "classcode", "ageclass", "category", "class", "event"]);
  const idxExtraClasses = findColumn(headers, ["secondaryclasses", "extraclasses", "additionalclasses", "multiclass"]);
  const idxSession = findColumn(headers, ["sessionnum", "session", "flight", "line"]);
  const idxEmail = findColumn(headers, ["email", "emailaddress"]);
  const idxBowShare = findColumn(headers, ["bowsharinggroup", "bowsharing", "sharedbow"]);

  const rows: ParsedParticipantRow[] = [];
  const warnings: string[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const cols = matrix[r];
    let firstName = idxFirst >= 0 ? cols[idxFirst] ?? "" : "";
    let lastName = idxLast >= 0 ? cols[idxLast] ?? "" : "";

    if ((!firstName || !lastName) && idxFullName >= 0 && cols[idxFullName]) {
      const parts = cols[idxFullName].trim().split(/\s+/);
      firstName = firstName || parts[0] || "";
      lastName = lastName || parts.slice(1).join(" ") || parts[0] || "";
    }

    if (!firstName && !lastName) {
      warnings.push(`Row ${r + 1}: missing athlete name (skipped).`);
      continue;
    }

    const bibRaw = idxBib >= 0 ? cols[idxBib] : "";
    const bibCode = (bibRaw || `CSV-${r}`).toUpperCase();
    const gender = normalizeGender(idxGender >= 0 ? cols[idxGender] : "M");
    const birthDate = normalizeDate(idxDob >= 0 ? cols[idxDob] : undefined);

    const clubNameRaw = idxClubName >= 0 ? cols[idxClubName] : "";
    const clubCodeRaw = idxClubCode >= 0 ? cols[idxClubCode] : "";
    const clubCode = (
      clubCodeRaw ||
      (clubNameRaw ? clubNameRaw.replace(/[^A-Za-z0-9]/g, "").slice(0, 5) : "IND")
    ).toUpperCase();
    const clubName = clubNameRaw || clubCode;

    const divisionCode = mapDivisionCode(idxDivision >= 0 ? cols[idxDivision] : "R");
    const primaryClassCode = ((idxClass >= 0 ? cols[idxClass] : "") || (gender === "W" ? "OPEN_W" : "OPEN_M"))
      .trim()
      .toUpperCase();

    const secondaryRaw = idxExtraClasses >= 0 ? cols[idxExtraClasses] ?? "" : "";
    const secondaryClassCodes = secondaryRaw
      .split(/[;|]/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0 && s !== primaryClassCode);

    const sessionVal = idxSession >= 0 ? cols[idxSession] : "";
    const sessionNum = sessionVal && !Number.isNaN(Number(sessionVal)) ? Number(sessionVal) : null;

    rows.push({
      lineNumber: r + 1,
      bibCode,
      firstName: firstName || lastName,
      lastName: lastName || firstName,
      gender,
      birthDate,
      clubCode,
      clubName,
      divisionCode,
      primaryClassCode,
      secondaryClassCodes,
      sessionNum,
      baleNumber: null,
      targetLetter: null,
      email: idxEmail >= 0 ? cols[idxEmail] || null : null,
      bowSharingGroup: idxBowShare >= 0 ? cols[idxBowShare] || null : null,
    });
  }

  return { formatDetected, rows, warnings };
}

/**
 * Auto-detects TSV vs CSV and dispatches to the appropriate parser.
 */
export function parseUnifiedParticipantFile(
  raw: string,
  format: "AUTO" | "IANSEO_TSV" | "EVENTBOOKING_CSV" | "COGNITO_CSV" | "NOCKPOINT_CSV" = "AUTO"
): ImportParseResult {
  if (format === "IANSEO_TSV") {
    return parseIanseoTsv(raw);
  }
  if (format === "AUTO") {
    const firstLine = normalizeLineEndings(raw).split("\n").find((l) => l.trim().length > 0) ?? "";
    const tabCount = (firstLine.match(/\t/g) ?? []).length;
    const commaCount = (firstLine.match(/,/g) ?? []).length;
    if (tabCount >= 5 && tabCount > commaCount) {
      return parseIanseoTsv(raw);
    }
  }
  return parseParticipantCsv(raw, format);
}

export function generateNockPointCsvTemplate(): string {
  return [
    "BibCode,FirstName,LastName,Gender,BirthDate,ClubCode,ClubName,DivisionCode,PrimaryClassCode,SecondaryClasses,SessionNum,BowSharingGroup",
    "SL-2001,Kasun,Perera,M,2007-05-14,COL,Colombo Archery Club,R,U21_M,OPEN_M,1,",
    "SL-2002,Nimali,Silva,W,2009-09-22,KAC,Kandy Archery Club,R,U18_W,,1,",
    "SL-2003,Dinesh,Fernando,M,1996-02-11,SLAA,Sri Lanka Army,C,OPEN_M,,1,",
  ].join("\n") + "\n";
}
