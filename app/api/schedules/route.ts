import { NextResponse } from "next/server";
import { solveSchedules, type Course, type SolverPreferences } from "@/lib/scheduler";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      courses?: Course[];
      selectedCodes?: string[];
      preferences?: SolverPreferences;
    };

    if (!Array.isArray(body.courses) || !Array.isArray(body.selectedCodes) || !body.preferences) {
      return NextResponse.json({ error: "Missing course or preference data." }, { status: 400 });
    }

    if (body.selectedCodes.length > 8) {
      return NextResponse.json(
        { error: "Choose up to 8 courses for one search." },
        { status: 400 },
      );
    }

    return NextResponse.json(solveSchedules(body.courses, body.selectedCodes, body.preferences));
  } catch {
    return NextResponse.json({ error: "The schedule request could not be read." }, { status: 400 });
  }
}
