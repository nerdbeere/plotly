import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gardenAreas, plants, tasks, userPlants } from "@/db/schema";

export const RECURRENCE_TASK_TYPES = ["water", "fertilize", "mow"] as const;
export type RecurrenceTaskType = (typeof RECURRENCE_TASK_TYPES)[number];

const XP_REWARDS: Record<RecurrenceTaskType, number> = {
  water: 10,
  fertilize: 15,
  mow: 15,
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

export function scheduleNextOccurrence(task: {
  userPlantId: number | null;
  gardenAreaId?: number | null;
  taskType: string;
}, completionDate: Date = new Date()): boolean {
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
  const intervalDays =
    taskType === "water" ? intervals.waterIntervalDays : intervals.fertilizeIntervalDays;
  if (!intervalDays || intervalDays <= 0) return false;

  // Never create a duplicate open task of the same type for the same plant
  if (hasOpenTask(plant.id, taskType)) return false;

  insertRecurringTask(plant.id, plant.customName, taskType, addDays(completionDate, intervalDays));
  return true;
}

export function scheduleNextAreaOccurrence(task: { gardenAreaId: number | null; taskType: string }, completionDate: Date = new Date()): boolean {
  if (!task.gardenAreaId || !["mow", "fertilize", "water"].includes(task.taskType)) return false;
  const area = db.select().from(gardenAreas).where(eq(gardenAreas.id, task.gardenAreaId)).get();
  if (!area) return false;
  const open = db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.gardenAreaId, area.id), eq(tasks.taskType, task.taskType), eq(tasks.completed, 0))).get();
  if (open) return false;
  const interval = task.taskType === "mow" ? area.mowIntervalDays : task.taskType === "fertilize" ? area.fertilizeIntervalDays : area.waterIntervalDays;
  db.insert(tasks).values({ gardenAreaId: area.id, title: task.taskType === "mow" ? `Mow ${area.name}` : task.taskType === "fertilize" ? `Fertilize ${area.name}` : `Water ${area.name}`, taskType: task.taskType, dueDate: addDays(completionDate, interval), xpReward: task.taskType === "mow" ? 15 : task.taskType === "fertilize" ? 20 : 10, completed: 0, createdAt: new Date().toISOString() }).run();
  return true;
}

export function regenerateSchedules(now: Date = new Date()): number {
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
      const intervalDays =
        taskType === "water" ? plant.waterIntervalDays : plant.fertilizeIntervalDays;
      if (!intervalDays || intervalDays <= 0) continue;
      if (hasOpenTask(plant.id, taskType)) continue;

      insertRecurringTask(plant.id, plant.customName, taskType, addDays(now, intervalDays));
      created++;
    }
  }
  const areas = db.select().from(gardenAreas).all();
  for (const area of areas) {
    for (const taskType of ["mow", "fertilize", "water"] as const) {
      if (hasOpenTaskForArea(area.id, taskType)) continue;
      const interval = taskType === "mow" ? area.mowIntervalDays : taskType === "fertilize" ? area.fertilizeIntervalDays : area.waterIntervalDays;
      db.insert(tasks).values({ gardenAreaId: area.id, title: taskType === "mow" ? `Mow ${area.name}` : taskType === "fertilize" ? `Fertilize ${area.name}` : `Water ${area.name}`, taskType, dueDate: addDays(now, interval), xpReward: taskType === "mow" ? 15 : taskType === "fertilize" ? 20 : 10, completed: 0, createdAt: new Date().toISOString() }).run();
      created++;
    }
  }
  return created;
}

function hasOpenTaskForArea(areaId: number, taskType: string): boolean {
  return Boolean(db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.gardenAreaId, areaId), eq(tasks.taskType, taskType), eq(tasks.completed, 0))).get());
}
