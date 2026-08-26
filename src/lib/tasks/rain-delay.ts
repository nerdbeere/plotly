import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { getGardenWeather } from "@/lib/ha/client";

const RAIN_FORECAST_THRESHOLD_MM = 5;

function getLocalDate(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split("T")[0];
}

export async function postponeWateringForRain() {
  const weather = await getGardenWeather();
  if (!shouldDelayWatering(weather)) return 0;

  const today = getLocalDate();
  const postponedUntil = getLocalDate(1);
  const dueWateringTasks = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.taskType, "water"), eq(tasks.completed, 0), lte(tasks.dueDate, today)))
    .all();

  for (const task of dueWateringTasks) {
    db.update(tasks).set({ dueDate: postponedUntil }).where(eq(tasks.id, task.id)).run();
  }

  return dueWateringTasks.length;
}

export function shouldDelayWatering(weather: Awaited<ReturnType<typeof getGardenWeather>>) {
  return weather.isRaining || weather.precipitationForecastTomorrow > RAIN_FORECAST_THRESHOLD_MM;
}
