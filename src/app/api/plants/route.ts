import { NextResponse } from "next/server";
import { db } from "@/db";
import { plants, userPlants, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const catalog = db.select().from(plants).all();
    const myPlants = db
      .select({
        id: userPlants.id,
        plantId: userPlants.plantId,
        customName: userPlants.customName,
        location: userPlants.location,
        plantedAt: userPlants.plantedAt,
        lastWateredAt: userPlants.lastWateredAt,
        lastFertilizedAt: userPlants.lastFertilizedAt,
        health: userPlants.health,
        notes: userPlants.notes,
         catalogName: plants.name,
         category: plants.category,
         description: plants.description,
         waterIntervalDays: plants.waterIntervalDays,
        fertilizeIntervalDays: plants.fertilizeIntervalDays,
        sunlight: plants.sunlight,
      })
      .from(userPlants)
      .leftJoin(plants, eq(userPlants.plantId, plants.id))
      .all();

    return NextResponse.json({ catalog, myPlants });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { plantId, customName, location, notes } = body;

    if (!plantId || !customName) {
      return NextResponse.json({ error: "plantId and customName are required" }, { status: 400 });
    }

    const plantDef = db.select().from(plants).where(eq(plants.id, plantId)).get();
    if (!plantDef) {
      return NextResponse.json({ error: "Plant catalog item not found" }, { status: 404 });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const newPlant = db
      .insert(userPlants)
      .values({
        plantId,
        customName,
        location: location || "Main Bed",
        plantedAt: todayStr,
        lastWateredAt: todayStr,
        health: "good",
        notes: notes || "",
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();

    // Auto-create initial watering task based on catalog interval
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + plantDef.waterIntervalDays);

    db.insert(tasks)
      .values({
        userPlantId: newPlant.id,
        title: `Water ${newPlant.customName}`,
        taskType: "water",
        dueDate: dueDate.toISOString().split("T")[0],
        xpReward: 10,
        completed: 0,
        createdAt: new Date().toISOString(),
      })
      .run();

    return NextResponse.json(newPlant, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
