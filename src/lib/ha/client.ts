import { db } from "@/db";
import { haSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMockWeather, getMockRainSensor, getMockSoilMoistures } from "./mock";
import { GardenWeather, HAEntityState, SoilMoistureReading } from "./types";

export async function getHaConfig() {
  const settings = db.select().from(haSettings).where(eq(haSettings.id, 1)).get();
  return (
    settings || {
      id: 1,
      baseUrl: process.env.HA_URL || "http://homeassistant.local:8123",
      token: process.env.HA_TOKEN || "",
      mockMode: 1,
      weatherEntityId: "weather.forecast_home",
      rainSensorEntityId: "binary_sensor.rain_sensor",
      moistureEntities: "[]",
      updatedAt: new Date().toISOString(),
    }
  );
}

export async function fetchHaEntity(entityId: string): Promise<HAEntityState | null> {
  const config = await getHaConfig();

  if (config.mockMode === 1 || !config.token) {
    if (entityId.includes("rain")) return getMockRainSensor();
    return null;
  }

  try {
    const url = `${config.baseUrl.replace(/\/+$/, "")}/api/states/${entityId}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn(`Home Assistant API returned ${res.status} for ${entityId}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Home Assistant fetch failed:", error);
    return null;
  }
}

export async function getGardenWeather(): Promise<GardenWeather> {
  const config = await getHaConfig();

  if (config.mockMode === 1 || !config.token) {
    return getMockWeather();
  }

  try {
    const weatherState = await fetchHaEntity(config.weatherEntityId);
    const rainState = await fetchHaEntity(config.rainSensorEntityId);

    if (!weatherState) {
      return getMockWeather();
    }

    const isRaining = rainState ? rainState.state === "on" : weatherState.state === "rainy" || weatherState.state === "pouring";

    return {
      condition: weatherState.state || "sunny",
      temperature: Number(weatherState.attributes?.temperature ?? 20),
      humidity: Number(weatherState.attributes?.humidity ?? 50),
      precipitationForecastTomorrow: Number(weatherState.attributes?.forecast?.[0]?.precipitation ?? 0),
      isRaining,
      isMock: false,
    };
  } catch (err) {
    return getMockWeather();
  }
}

export async function getSoilMoistureReadings(): Promise<SoilMoistureReading[]> {
  const config = await getHaConfig();

  if (config.mockMode === 1 || !config.token) {
    return getMockSoilMoistures();
  }

  try {
    const entityIds: string[] = JSON.parse(config.moistureEntities || "[]");
    if (entityIds.length === 0) return [];

    const results: SoilMoistureReading[] = [];
    for (const id of entityIds) {
      const state = await fetchHaEntity(id);
      if (state) {
        const val = parseFloat(state.state) || 0;
        let status: "dry" | "optimal" | "wet" = "optimal";
        if (val < 30) status = "dry";
        else if (val > 70) status = "wet";

        results.push({
          entity_id: id,
          name: state.attributes?.friendly_name || id,
          moisturePercent: val,
          status,
        });
      }
    }
    return results;
  } catch (err) {
    return getMockSoilMoistures();
  }
}
