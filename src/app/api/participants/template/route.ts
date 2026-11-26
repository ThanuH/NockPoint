import { NextResponse } from "next/server";
import { generateIanseoTsvTemplate } from "@/domain/importers/tsvImporter";
import { generateNockPointCsvTemplate } from "@/domain/importers/csvImporter";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "nockpoint").toLowerCase();

  if (format === "ianseo_tsv" || format === "tsv") {
    const tsv = generateIanseoTsvTemplate();
    return new NextResponse(tsv, {
      status: 200,
      headers: {
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ianseo_21col_template.tab"',
      },
    });
  }

  const csv = generateNockPointCsvTemplate();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nockpoint_participants_template.csv"',
    },
  });
}
