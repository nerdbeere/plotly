import { NextResponse } from "next/server";
import { desc, gte } from "drizzle-orm";
import { db } from "@/db";
import { soilMoistureReadings } from "@/db/schema";
import { getSoilMoistureReadings } from "@/lib/ha/client";
import { getDrySoilSuggestions } from "@/lib/tasks/moisture-delay";

const HISTORY_DAYS = 7;

export async function GET() {
  try {
    const current = await getSoilMoistureReadings();
    const suggestions = await getDrySoilSuggestions();
    const recordedAt = new Date().toISOString();

    if (current.length > 0) {
      db.insert(soilMoistureReadings)
        .values(current.map((reading) => ({
          entityId: reading.entity_id,
          name: reading.name,
          moisturePercent: Math.round(reading.moisturePercent),
          recordedAt,
        })))
        .run();
    }

    const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const history = db
      .select()
      .from(soilMoistureReadings)
      .where(gte(soilMoistureReadings.recordedAt, since))
      .orderBy(desc(soilMoistureReadings.recordedAt))
      .all();

    return NextResponse.json({ current, history, historyDays: HISTORY_DAYS, suggestions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unable to load moisture telemetry" }, { status: 500 });
  }
}
