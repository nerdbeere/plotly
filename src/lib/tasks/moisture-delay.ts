import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { tasks, userPlants } from "@/db/schema";
import { getMoistureEntityLocations, getSoilMoistureReadings } from "@/lib/ha/client";
import { MoistureSuggestion } from "@/lib/ha/types";

function getLocalDate(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

function normalizeLocation(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

async function getMappedSensorsByStatus(status: "dry" | "optimal" | "wet") {
  const [readings, mapping] = await Promise.all([getSoilMoistureReadings(), getMoistureEntityLocations()]);
  return readings
    .filter((reading) => reading.status === status)
    .map((reading) => ({
      entityId: reading.entity_id,
      sensorName: reading.name,
      location: mapping[reading.entity_id] || "",
    }))
    .filter((sensor) => sensor.location.trim().length > 0);
}

async function getLocationsWithOpenWateringTask(): Promise<Set<string>> {
  const openWaterTasks = db
    .select({ location: userPlants.location })
    .from(tasks)
    .innerJoin(userPlants, eq(tasks.userPlantId, userPlants.id))
    .where(and(eq(tasks.taskType, "water"), eq(tasks.completed, 0)))
    .all();

  return new Set(openWaterTasks.map((task) => normalizeLocation(task.location)));
}

/**
 * Postpone watering tasks due today (or overdue) by one day when the mapped
 * soil moisture sensor for the plant's location reads "optimal" or "wet".
 * Sibling rule to postponeWateringForRain() — same postpone pattern.
 */
export async function postponeWateringForWetSoil() {
  const sensors = [
    ...(await getMappedSensorsByStatus("optimal")),
    ...(await getMappedSensorsByStatus("wet")),
  ];
  if (sensors.length === 0) return 0;

  const wetLocations = new Set(sensors.map((sensor) => normalizeLocation(sensor.location)));

  const today = getLocalDate();
  const postponedUntil = getLocalDate(1);
  const dueWateringTasks = db
    .select({ id: tasks.id, location: userPlants.location })
    .from(tasks)
    .innerJoin(userPlants, eq(tasks.userPlantId, userPlants.id))
    .where(and(eq(tasks.taskType, "water"), eq(tasks.completed, 0), lte(tasks.dueDate, today)))
    .all();

  const toPostpone = dueWateringTasks.filter((task) => wetLocations.has(normalizeLocation(task.location)));

  for (const task of toPostpone) {
    db.update(tasks).set({ dueDate: postponedUntil }).where(eq(tasks.id, task.id)).run();
  }

  return toPostpone.length;
}

/**
 * Build dashboard suggestions for mapped sensors that read "dry" and have
 * plants at the mapped location. Unmapped sensors never surface here.
 */
export async function getDrySoilSuggestions(): Promise<MoistureSuggestion[]> {
  const drySensors = await getMappedSensorsByStatus("dry");
  if (drySensors.length === 0) return [];

  const locationsWithOpenTask = await getLocationsWithOpenWateringTask();
  const allPlants = db
    .select({ id: userPlants.id, customName: userPlants.customName, location: userPlants.location })
    .from(userPlants)
    .all();

  return drySensors.map((sensor) => {
    const normalized = normalizeLocation(sensor.location);
    const plant = allPlants.find((candidate) => normalizeLocation(candidate.location) === normalized);
    return {
      entityId: sensor.entityId,
      sensorName: sensor.sensorName,
      location: sensor.location,
      plantId: plant?.id ?? null,
      plantName: plant?.customName ?? null,
      hasOpenTask: locationsWithOpenTask.has(normalized),
    };
  });
}

/**
 * Create a watering task for the first plant at the given location if no
 * open watering task exists there. Returns null when nothing was created.
 */
export async function createWateringTaskForDryLocation(location: string) {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;

  const locationsWithOpenTask = await getLocationsWithOpenWateringTask();
  if (locationsWithOpenTask.has(normalized)) return null;

  const plant = db
    .select({ id: userPlants.id, customName: userPlants.customName, location: userPlants.location })
    .from(userPlants)
    .all()
    .find((candidate) => normalizeLocation(candidate.location) === normalized);
  if (!plant) return null;

  return db
    .insert(tasks)
    .values({
      userPlantId: plant.id,
      title: `Water ${plant.customName} (dry soil alert)`,
      taskType: "water",
      dueDate: getLocalDate(),
      xpReward: 10,
      completed: 0,
      createdAt: new Date().toISOString(),
    })
    .returning()
    .get();
}
