import { NextResponse } from "next/server";
import { db } from "@/db";
import { userPlants, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const plantId = parseInt(id, 10);
    if (isNaN(plantId)) {
      return NextResponse.json({ error: "Invalid plant ID" }, { status: 400 });
    }

    const body = await req.json();
    const { customName, location, notes } = body;

    if (!customName || typeof customName !== "string" || !customName.trim()) {
      return NextResponse.json({ error: "customName is required" }, { status: 400 });
    }

    const existing = db.select().from(userPlants).where(eq(userPlants.id, plantId)).get();
    if (!existing) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    const updated = db
      .update(userPlants)
      .set({
        customName: customName.trim(),
        location: typeof location === "string" && location.trim() ? location.trim() : existing.location,
        notes: typeof notes === "string" ? notes : existing.notes,
      })
      .where(eq(userPlants.id, plantId))
      .returning()
      .get();

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const plantId = parseInt(id, 10);
    if (isNaN(plantId)) {
      return NextResponse.json({ error: "Invalid plant ID" }, { status: 400 });
    }

    const existing = db.select().from(userPlants).where(eq(userPlants.id, plantId)).get();
    if (!existing) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    // Remove all tasks tied to this plant (open + completed) so no orphaned
    // FK references remain. XP, level, streaks and badges are untouched.
    const deletedTasks = db.delete(tasks).where(eq(tasks.userPlantId, plantId)).run().changes;
    db.delete(userPlants).where(eq(userPlants.id, plantId)).run();

    return NextResponse.json({ deletedPlant: existing.id, deletedTasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
