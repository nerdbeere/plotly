import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gardenAreas, tasks } from "@/db/schema";
import { addDays } from "@/lib/tasks/recurrence";

function schedule(areaId: number, name: string, type: "mow" | "fertilize", dueDate: string) {
  db.insert(tasks).values({
    gardenAreaId: areaId,
    title: type === "mow" ? `Mow ${name}` : `Fertilize ${name}`,
    taskType: type,
    dueDate,
    xpReward: type === "mow" ? 15 : 20,
    completed: 0,
    createdAt: new Date().toISOString(),
  }).run();
}

export async function GET() {
  const areas = db.select().from(gardenAreas).where(eq(gardenAreas.type, "lawn")).all();
  return NextResponse.json(areas);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "A lawn name is required" }, { status: 400 });
    const mowIntervalDays = Math.max(1, Number(body.mowIntervalDays) || 7);
    const fertilizeIntervalDays = Math.max(1, Number(body.fertilizeIntervalDays) || 30);
    const area = db.insert(gardenAreas).values({
      type: "lawn", name, sizeSqm: body.sizeSqm ? Number(body.sizeSqm) : null,
    grassType: body.grassType ? String(body.grassType).trim() : null,
      waterIntervalDays: Math.max(1, Number(body.waterIntervalDays) || 3),
      mowIntervalDays, fertilizeIntervalDays, createdAt: new Date().toISOString(),
    }).returning().get();
    const now = new Date();
    schedule(area.id, area.name, "mow", addDays(now, mowIntervalDays));
    schedule(area.id, area.name, "fertilize", addDays(now, fertilizeIntervalDays));
    db.insert(tasks).values({ gardenAreaId: area.id, title: `Water ${area.name}`, taskType: "water", dueDate: addDays(now, area.waterIntervalDays), xpReward: 10, completed: 0, createdAt: new Date().toISOString() }).run();
    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create lawn" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const existing = db.select().from(gardenAreas).where(eq(gardenAreas.id, id)).get();
    if (!existing) return NextResponse.json({ error: "Lawn not found" }, { status: 404 });
    const area = db.update(gardenAreas).set({
      name: String(body.name || existing.name).trim(),
      sizeSqm: body.sizeSqm ? Number(body.sizeSqm) : null,
      grassType: body.grassType ? String(body.grassType).trim() : null,
      mowIntervalDays: Math.max(1, Number(body.mowIntervalDays) || existing.mowIntervalDays),
      fertilizeIntervalDays: Math.max(1, Number(body.fertilizeIntervalDays) || existing.fertilizeIntervalDays),
      waterIntervalDays: Math.max(1, Number(body.waterIntervalDays) || existing.waterIntervalDays),
    }).where(eq(gardenAreas.id, id)).returning().get();
    return NextResponse.json(area);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update lawn" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = Number((await request.json()).id);
  db.delete(tasks).where(eq(tasks.gardenAreaId, id)).run();
  db.delete(gardenAreas).where(eq(gardenAreas.id, id)).run();
  return NextResponse.json({ ok: true });
}
