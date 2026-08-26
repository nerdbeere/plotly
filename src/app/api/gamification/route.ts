import { NextResponse } from "next/server";
import { getGamificationState } from "@/lib/gamification/engine";
import { getBadges } from "@/lib/gamification/badges";

export async function GET() {
  try {
    const state = await getGamificationState();
    return NextResponse.json({ ...state, badges: getBadges() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
