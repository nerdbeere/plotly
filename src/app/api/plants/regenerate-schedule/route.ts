import { NextResponse } from "next/server";
import { regenerateSchedules } from "@/lib/tasks/recurrence";

export async function POST() {
  try {
    const created = regenerateSchedules();
    return NextResponse.json({ created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
