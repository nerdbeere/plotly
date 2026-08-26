import { NextResponse } from "next/server";
import { getGamificationState } from "@/lib/gamification/engine";

export async function GET() {
  try {
    const state = await getGamificationState();
    return NextResponse.json(state);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
