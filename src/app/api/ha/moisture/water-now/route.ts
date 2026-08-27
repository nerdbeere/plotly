import { NextResponse } from "next/server";
import { createWateringTaskForDryLocation } from "@/lib/tasks/moisture-delay";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const location = typeof body?.location === "string" ? body.location : "";

    if (!location.trim()) {
      return NextResponse.json({ error: "location is required" }, { status: 400 });
    }

    const task = await createWateringTaskForDryLocation(location);
    if (!task) {
      return NextResponse.json({ created: false, reason: "No plant at this location or an open watering task already exists" });
    }

    return NextResponse.json({ created: true, task }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unable to create watering task" }, { status: 500 });
  }
}
