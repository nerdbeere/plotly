import { NextResponse } from "next/server";
import { db } from "@/db";
import { gamification, plants, tasks, userPlants } from "@/db/schema";
import { getHaConfig, getGardenWeather } from "@/lib/ha/client";

export async function GET() {
  try {
    const plantCount = db.select().from(plants).all().length;
    const userPlantCount = db.select().from(userPlants).all().length;
    const taskCount = db.select().from(tasks).all().length;
    const game = db.select().from(gamification).all()[0];
    const haConfig = await getHaConfig();
    const weather = await getGardenWeather();

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        catalogPlants: plantCount,
        activePlants: userPlantCount,
        pendingTasks: taskCount,
      },
      gamification: {
        level: game?.level ?? 1,
        totalXp: game?.totalXp ?? 0,
        streak: game?.currentStreak ?? 0,
      },
      homeAssistant: {
        mockMode: haConfig.mockMode === 1,
        configured: Boolean(haConfig.token),
        weatherCondition: weather.condition,
        temperature: weather.temperature,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        error: error.message || "Health check failed",
      },
      { status: 500 }
    );
  }
}
