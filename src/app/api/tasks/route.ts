import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, userPlants, plants, gardenAreas } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { postponeWateringForRain } from "@/lib/tasks/rain-delay";
import { postponeWateringForWetSoil } from "@/lib/tasks/moisture-delay";
import { sendTaskNotifications } from "@/lib/ha/notify";

export async function GET() {
  try {
    await postponeWateringForRain();
    await postponeWateringForWetSoil();
    await sendTaskNotifications();
    const allTasks = db
      .select({
        id: tasks.id,
        userPlantId: tasks.userPlantId,
        gardenAreaId: tasks.gardenAreaId,
        title: tasks.title,
        taskType: tasks.taskType,
        dueDate: tasks.dueDate,
        completed: tasks.completed,
        completedAt: tasks.completedAt,
        xpReward: tasks.xpReward,
        lastNotifiedAt: tasks.lastNotifiedAt,
        lastNotifiedDate: tasks.lastNotifiedDate,
        createdAt: tasks.createdAt,
        plantName: userPlants.customName,
        plantLocation: userPlants.location,
        plantCategory: plants.category,
        areaName: gardenAreas.name,
      })
      .from(tasks)
      .leftJoin(userPlants, eq(tasks.userPlantId, userPlants.id))
      .leftJoin(plants, eq(userPlants.plantId, plants.id))
      .leftJoin(gardenAreas, eq(tasks.gardenAreaId, gardenAreas.id))
      .orderBy(tasks.completed, tasks.dueDate)
      .all();

    return NextResponse.json(allTasks);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userPlantId, gardenAreaId, title, taskType, dueDate, xpReward } = body;

    if (!title || !taskType || !dueDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newTask = db
      .insert(tasks)
      .values({
        userPlantId: userPlantId ? Number(userPlantId) : null,
        gardenAreaId: gardenAreaId ? Number(gardenAreaId) : null,
        title,
        taskType,
        dueDate,
        xpReward: xpReward || 10,
        completed: 0,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();

    if (taskType === "water") {
      await postponeWateringForRain();
      await postponeWateringForWetSoil();
    }

    return NextResponse.json(newTask, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
