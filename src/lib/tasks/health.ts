import { db } from "@/db";
import { plants, tasks, userPlants } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

const CARE_TASK_TYPES = ["water", "fertilize"] as const;
const OVERDUE_ATTENTION_DAYS = 2;

function daysBetween(date: string, today: Date) {
  const due = new Date(`${date}T00:00:00Z`);
  return Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - due.getTime()) / 86400000);
}

export function refreshPlantHealth() {
  const records = db
    .select({
      id: userPlants.id,
      lastWateredAt: userPlants.lastWateredAt,
      lastFertilizedAt: userPlants.lastFertilizedAt,
      waterIntervalDays: plants.waterIntervalDays,
      fertilizeIntervalDays: plants.fertilizeIntervalDays,
    })
    .from(userPlants)
    .innerJoin(plants, eq(userPlants.plantId, plants.id))
    .all();
  const today = new Date();
  const overdueTasks = db
    .select({ userPlantId: tasks.userPlantId, dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(eq(tasks.completed, 0), inArray(tasks.taskType, [...CARE_TASK_TYPES])))
    .all();
  const attentionIds = new Set(
    overdueTasks
      .filter((task) => task.userPlantId !== null && daysBetween(task.dueDate, today) > OVERDUE_ATTENTION_DAYS)
      .map((task) => task.userPlantId)
  );

  for (const plant of records) {
    const waterCurrent = plant.lastWateredAt && daysBetween(plant.lastWateredAt, today) <= plant.waterIntervalDays;
    const fertilizerCurrent =
      plant.fertilizeIntervalDays <= 0 ||
      (plant.lastFertilizedAt && daysBetween(plant.lastFertilizedAt, today) <= plant.fertilizeIntervalDays);
    const health = attentionIds.has(plant.id)
      ? "needs_attention"
      : waterCurrent && fertilizerCurrent
        ? "thriving"
        : "good";
    db.update(userPlants).set({ health }).where(eq(userPlants.id, plant.id)).run();
  }
}
