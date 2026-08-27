import { db } from "@/db";
import { haSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMockWeather, getMockRainSensor, getMockSoilMoistures } from "./mock";
import { GardenWeather, HAEntityState, SoilMoistureReading } from "./types";

const DEFAULT_HA_URL = "http://homeassistant.local:8123";

export async function getHaConfig() {
  const settings = db.select().from(haSettings).where(eq(haSettings.id, 1)).get();
  const configuredUrl = process.env.HA_URL?.trim();
  const configuredToken = process.env.HA_TOKEN?.trim();

  if (!settings) {
    return {
      id: 1,
      baseUrl: configuredUrl || DEFAULT_HA_URL,
      token: configuredToken || "",
      mockMode: configuredToken ? 0 : 1,
      weatherEntityId: "weather.forecast_home",
      rainSensorEntityId: "binary_sensor.rain_sensor",
      moistureEntities: "[]",
      moistureEntityLocations: "{}",
      notifyEnabled: 0,
      notifyService: "persistent_notification",
      quietHoursStart: 22,
      quietHoursEnd: 7,
      updatedAt: new Date().toISOString(),
    };
  }

  // Seeded settings contain local defaults. Use deployment credentials when the
  // database has not been configured yet, without overriding saved UI values.
  return {
    ...settings,
    baseUrl: configuredUrl && settings.baseUrl === DEFAULT_HA_URL ? configuredUrl : settings.baseUrl,
    token: settings.token || configuredToken || "",
    mockMode: settings.token || !configuredToken ? settings.mockMode : 0,
  };
}

export async function getMoistureEntityLocations(): Promise<Record<string, string>> {
  const config = await getHaConfig();
  try {
    const parsed = JSON.parse(config.moistureEntityLocations || "{}");
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getUnavailableWeather(): GardenWeather {
  return {
    condition: "unknown",
    temperature: 0,
    humidity: 0,
    precipitationForecastTomorrow: 0,
    isRaining: false,
    isMock: false,
    unavailable: true,
  };
}

export async function fetchHaEntity(entityId: string): Promise<HAEntityState | null> {
  const config = await getHaConfig();

  if (config.mockMode === 1) {
    if (entityId.includes("rain")) return getMockRainSensor();
    return null;
  }

  // Live mode: never fabricate mock data when no token is configured.
  if (!config.token) {
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
      signal: AbortSignal.timeout(10_000),
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

  if (config.mockMode === 1) {
    return getMockWeather();
  }

  // Live mode: report unavailability honestly instead of falling back to mock data.
  if (!config.token) {
    return getUnavailableWeather();
  }

  try {
    const weatherState = await fetchHaEntity(config.weatherEntityId);
    const rainState = await fetchHaEntity(config.rainSensorEntityId);

    if (!weatherState) {
      return getUnavailableWeather();
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
    return getUnavailableWeather();
  }
}

export async function getSoilMoistureReadings(): Promise<SoilMoistureReading[]> {
  const config = await getHaConfig();

  if (config.mockMode === 1) {
    return getMockSoilMoistures();
  }

  // Live mode: never fabricate mock readings when no token is configured.
  if (!config.token) {
    return [];
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
    console.error("Soil moisture fetch failed:", err);
    return [];
  }
}
