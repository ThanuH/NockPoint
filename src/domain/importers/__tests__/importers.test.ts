import test from "node:test";
import assert from "node:assert/strict";
import { parseIanseoTsv, generateIanseoTsvTemplate } from "../tsvImporter";
import { parseUnifiedParticipantFile, generateNockPointCsvTemplate } from "../csvImporter";

test("parses 21-column legacy Ianseo TSV with CRLF line endings", () => {
  const tsv = generateIanseoTsvTemplate().replace(/\n/g, "\r\n");
  const result = parseUnifiedParticipantFile(tsv, "AUTO");
  assert.equal(result.formatDetected, "IANSEO_TSV");
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].bibCode, "SL-1001");
  assert.equal(result.rows[0].lastName, "PERERA");
  assert.equal(result.rows[0].firstName, "Kasun");
  assert.equal(result.rows[0].baleNumber, 1);
  assert.equal(result.rows[0].targetLetter, "A");
  assert.equal(result.rows[1].gender, "W");
});

test("parses EventBooking CSV with quoted club names", () => {
  const csv = [
    'Registrant ID,First Name,Last Name,Gender,Date of Birth,Club,Division,Class,Session',
    'EB-01,Amal,Bandara,Male,2008-04-12,"Royal College, Colombo",Recurve,U18_M,1',
    'EB-02,Sithumi,Jayawardena,Female,2006-11-03,"Ladies College, Colombo",Compound,OPEN_W,2',
  ].join("\r\n");

  const result = parseUnifiedParticipantFile(csv, "AUTO");
  assert.equal(result.formatDetected, "EVENTBOOKING_CSV");
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].clubName, "Royal College, Colombo");
  assert.equal(result.rows[0].divisionCode, "R");
  assert.equal(result.rows[1].divisionCode, "C");
  assert.equal(result.rows[1].gender, "W");
});

test("parses Cognito Forms CSV", () => {
  const csv = [
    "Entry_Number,Name_First,Name_Last,Sex,DOB,Organization,Bow_Style,Age_Class",
    "101,Tharindu,Gunawardena,M,2001-01-19,Kurunegala AC,Barebow,OPEN_M",
  ].join("\n");

  const result = parseUnifiedParticipantFile(csv, "AUTO");
  assert.equal(result.formatDetected, "COGNITO_CSV");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].bibCode, "101");
  assert.equal(result.rows[0].divisionCode, "B");
});

test("parses NockPoint CSV template including secondary multi-class entries", () => {
  const csv = generateNockPointCsvTemplate();
  const result = parseUnifiedParticipantFile(csv, "AUTO");
  assert.equal(result.formatDetected, "NOCKPOINT_CSV");
  assert.equal(result.rows.length, 3);
  assert.deepEqual(result.rows[0].secondaryClassCodes, ["OPEN_M"]);
});
