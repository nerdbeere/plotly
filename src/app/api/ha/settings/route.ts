import { NextResponse } from "next/server";
import { db } from "@/db";
import { haSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getHaConfig, getGardenWeather, getSoilMoistureReadings, getMoistureEntityLocations } from "@/lib/ha/client";
import { sanitizeNotifyService } from "@/lib/ha/notify";

function clampHour(value: unknown, fallback: number): number {
  const hour = Number(value);
  if (!Number.isFinite(hour)) return fallback;
  return Math.min(23, Math.max(0, Math.round(hour)));
}

export async function GET() {
  try {
    const config = await getHaConfig();
    const weather = await getGardenWeather();
    const moistures = await getSoilMoistureReadings();
    const moistureEntityLocations = await getMoistureEntityLocations();

    return NextResponse.json({
      config: {
        baseUrl: config.baseUrl,
        token: config.token ? "••••••••" + config.token.slice(-4) : "",
        hasToken: Boolean(config.token),
        mockMode: config.mockMode === 1,
        weatherEntityId: config.weatherEntityId,
        rainSensorEntityId: config.rainSensorEntityId,
        moistureEntities: JSON.parse(config.moistureEntities || "[]"),
        moistureEntityLocations,
        notifyEnabled: config.notifyEnabled === 1,
        notifyService: config.notifyService,
        quietHoursStart: config.quietHoursStart,
        quietHoursEnd: config.quietHoursEnd,
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
    const {
      baseUrl,
      token,
      mockMode,
      weatherEntityId,
      rainSensorEntityId,
      moistureEntities,
      moistureEntityLocations,
      notifyEnabled,
      notifyService,
      quietHoursStart,
      quietHoursEnd,
    } = body;

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
    if (moistureEntityLocations !== undefined) updatePayload.moistureEntityLocations = JSON.stringify(moistureEntityLocations);
    if (notifyEnabled !== undefined) updatePayload.notifyEnabled = notifyEnabled ? 1 : 0;
    if (notifyService !== undefined) updatePayload.notifyService = sanitizeNotifyService(String(notifyService));
    if (quietHoursStart !== undefined) updatePayload.quietHoursStart = clampHour(quietHoursStart, 22);
    if (quietHoursEnd !== undefined) updatePayload.quietHoursEnd = clampHour(quietHoursEnd, 7);

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
        moistureEntityLocations: JSON.stringify(moistureEntityLocations || {}),
        notifyEnabled: notifyEnabled ? 1 : 0,
        notifyService: notifyService !== undefined ? sanitizeNotifyService(String(notifyService)) : "persistent_notification",
        quietHoursStart: quietHoursStart !== undefined ? clampHour(quietHoursStart, 22) : 22,
        quietHoursEnd: quietHoursEnd !== undefined ? clampHour(quietHoursEnd, 7) : 7,
        updatedAt: new Date().toISOString(),
      }).run();
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
