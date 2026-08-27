import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { plants, tasks, userPlants } from "@/db/schema";
import { getGardenWeather } from "@/lib/ha/client";
import { getEffectiveWateringInterval } from "@/lib/tasks/heat";

export const RECURRENCE_TASK_TYPES = ["water", "fertilize"] as const;
export type RecurrenceTaskType = (typeof RECURRENCE_TASK_TYPES)[number];

const XP_REWARDS: Record<RecurrenceTaskType, number> = {
  water: 10,
  fertilize: 15,
};

function toDateOnly(date: Date): string {
  const local = new Date(date);
  local.setHours(12, 0, 0, 0);
  return local.toISOString().split("T")[0];
}

export function addDays(date: Date, days: number): string {
  const local = new Date(date);
  local.setHours(12, 0, 0, 0);
  local.setDate(local.getDate() + days);
  return local.toISOString().split("T")[0];
}

function taskTitle(taskType: RecurrenceTaskType, plantName: string): string {
  return taskType === "water" ? `Water ${plantName}` : `Fertilize ${plantName}`;
}

function hasOpenTask(userPlantId: number, taskType: RecurrenceTaskType): boolean {
  const open = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.userPlantId, userPlantId),
        eq(tasks.taskType, taskType),
        eq(tasks.completed, 0)
      )
    )
    .get();
  return Boolean(open);
}

function insertRecurringTask(
  userPlantId: number,
  plantName: string,
  taskType: RecurrenceTaskType,
  dueDate: string
) {
  db.insert(tasks)
    .values({
      userPlantId,
      title: taskTitle(taskType, plantName),
      taskType,
      dueDate,
      xpReward: XP_REWARDS[taskType],
      completed: 0,
      createdAt: new Date().toISOString(),
    })
    .run();
}

export function getCatalogIntervals(plantId: string): { waterIntervalDays: number; fertilizeIntervalDays: number } | null {
  const catalog = db
    .select({
      waterIntervalDays: plants.waterIntervalDays,
      fertilizeIntervalDays: plants.fertilizeIntervalDays,
    })
    .from(plants)
    .where(eq(plants.id, plantId))
    .get();
  return catalog ?? null;
}

export async function scheduleNextOccurrence(task: {
  userPlantId: number | null;
  taskType: string;
}, completionDate: Date = new Date()): Promise<boolean> {
  if (!task.userPlantId) return false;
  if (!RECURRENCE_TASK_TYPES.includes(task.taskType as RecurrenceTaskType)) return false;

  const plant = db
    .select({
      id: userPlants.id,
      customName: userPlants.customName,
      plantId: userPlants.plantId,
    })
    .from(userPlants)
    .where(eq(userPlants.id, task.userPlantId))
    .get();
  if (!plant) return false;

  const intervals = getCatalogIntervals(plant.plantId);
  if (!intervals) return false;

  const taskType = task.taskType as RecurrenceTaskType;
  let intervalDays =
    taskType === "water" ? intervals.waterIntervalDays : intervals.fertilizeIntervalDays;
  if (!intervalDays || intervalDays <= 0) return false;

  if (taskType === "water") {
    const weather = await getGardenWeather();
    if (!weather.unavailable) {
      intervalDays = getEffectiveWateringInterval(intervalDays, weather.temperature);
    }
  }

  // Never create a duplicate open task of the same type for the same plant
  if (hasOpenTask(plant.id, taskType)) return false;

  insertRecurringTask(plant.id, plant.customName, taskType, addDays(completionDate, intervalDays));
  return true;
}

export async function regenerateSchedules(now: Date = new Date()): Promise<number> {
  const myPlants = db
    .select({
      id: userPlants.id,
      customName: userPlants.customName,
      plantId: userPlants.plantId,
      waterIntervalDays: plants.waterIntervalDays,
      fertilizeIntervalDays: plants.fertilizeIntervalDays,
    })
    .from(userPlants)
    .leftJoin(plants, eq(userPlants.plantId, plants.id))
    .all();

  let created = 0;
  for (const plant of myPlants) {
    for (const taskType of RECURRENCE_TASK_TYPES) {
      let intervalDays =
        taskType === "water" ? plant.waterIntervalDays : plant.fertilizeIntervalDays;
      if (!intervalDays || intervalDays <= 0) continue;
      if (taskType === "water") {
        const weather = await getGardenWeather();
        if (!weather.unavailable) {
          intervalDays = getEffectiveWateringInterval(intervalDays, weather.temperature);
        }
      }
      if (hasOpenTask(plant.id, taskType)) continue;

      insertRecurringTask(plant.id, plant.customName, taskType, addDays(now, intervalDays));
      created++;
    }
  }
  return created;
}
