import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const faces = await prisma.targetFace.findMany({
      orderBy: { diameterCm: "desc" },
    });
    return NextResponse.json(faces);
  } catch (error) {
    console.error("GET /api/target-faces error:", error);
    return NextResponse.json({ error: "Failed to fetch target faces" }, { status: 500 });
  }
}
