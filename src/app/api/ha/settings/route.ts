import { NextResponse } from "next/server";
import { db } from "@/db";
import { haSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getHaConfig, getGardenWeather, getSoilMoistureReadings } from "@/lib/ha/client";

export async function GET() {
  try {
    const config = await getHaConfig();
    const weather = await getGardenWeather();
    const moistures = await getSoilMoistureReadings();

    return NextResponse.json({
      config: {
        baseUrl: config.baseUrl,
        token: config.token ? "••••••••" + config.token.slice(-4) : "",
        hasToken: Boolean(config.token),
        mockMode: config.mockMode === 1,
        weatherEntityId: config.weatherEntityId,
        rainSensorEntityId: config.rainSensorEntityId,
        moistureEntities: JSON.parse(config.moistureEntities || "[]"),
      },
      live: {
        weather,
        moistures,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { baseUrl, token, mockMode, weatherEntityId, rainSensorEntityId, moistureEntities } = body;

    const existing = db.select().from(haSettings).where(eq(haSettings.id, 1)).get();

    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (baseUrl !== undefined) updatePayload.baseUrl = baseUrl;
    if (token !== undefined && !token.startsWith("••••••••")) updatePayload.token = token;
    if (mockMode !== undefined) updatePayload.mockMode = mockMode ? 1 : 0;
    if (weatherEntityId !== undefined) updatePayload.weatherEntityId = weatherEntityId;
    if (rainSensorEntityId !== undefined) updatePayload.rainSensorEntityId = rainSensorEntityId;
    if (moistureEntities !== undefined) updatePayload.moistureEntities = JSON.stringify(moistureEntities);

    if (existing) {
      db.update(haSettings).set(updatePayload).where(eq(haSettings.id, 1)).run();
    } else {
      db.insert(haSettings).values({
        id: 1,
        baseUrl: baseUrl || "http://homeassistant.local:8123",
        token: token || "",
        mockMode: mockMode ? 1 : 0,
        weatherEntityId: weatherEntityId || "weather.forecast_home",
        rainSensorEntityId: rainSensorEntityId || "binary_sensor.rain_sensor",
        moistureEntities: JSON.stringify(moistureEntities || []),
        updatedAt: new Date().toISOString(),
      }).run();
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
