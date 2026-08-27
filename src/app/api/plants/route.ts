import { NextResponse } from "next/server";
import { db } from "@/db";
import { plants, userPlants, tasks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { refreshPlantHealth } from "@/lib/tasks/health";

export async function GET() {
  try {
    const catalog = db.select().from(plants).all();
    refreshPlantHealth();
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

    const pendingTasks = db
      .select({ userPlantId: tasks.userPlantId })
      .from(tasks)
      .where(and(eq(tasks.completed, 0)))
      .all();
    const pendingCountByPlant = new Map<number, number>();
    for (const t of pendingTasks) {
      if (t.userPlantId !== null) {
        pendingCountByPlant.set(t.userPlantId, (pendingCountByPlant.get(t.userPlantId) || 0) + 1);
      }
    }

    const myPlantsWithCounts = myPlants.map((p) => ({
      ...p,
      pendingTaskCount: pendingCountByPlant.get(p.id) || 0,
    }));

    return NextResponse.json({ catalog, myPlants: myPlantsWithCounts });
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

    // Auto-create initial fertilizing task based on catalog interval
    if (plantDef.fertilizeIntervalDays > 0) {
      const fertilizeDueDate = new Date();
      fertilizeDueDate.setDate(fertilizeDueDate.getDate() + plantDef.fertilizeIntervalDays);

      db.insert(tasks)
        .values({
          userPlantId: newPlant.id,
          title: `Fertilize ${newPlant.customName}`,
          taskType: "fertilize",
          dueDate: fertilizeDueDate.toISOString().split("T")[0],
          xpReward: 15,
          completed: 0,
          createdAt: new Date().toISOString(),
        })
        .run();
    }

    return NextResponse.json(newPlant, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
