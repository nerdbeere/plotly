import { and, eq, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { gardenAreas, tasks, userPlants } from "@/db/schema";
import { getHaConfig } from "./client";
import { sendMockNotification } from "./mock";

const NOTIFY_TITLE = "GardenPlot";

export interface NotificationResult {
  sent: number;
  deferred: number;
  skipped: boolean; // feature disabled
}

function getLocalDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date.toISOString().split("T")[0];
}

export function isQuietHour(hour: number, quietStart: number, quietEnd: number): boolean {
  if (!Number.isInteger(quietStart) || !Number.isInteger(quietEnd) || quietStart === quietEnd) return false;
  if (quietStart < quietEnd) return hour >= quietStart && hour < quietEnd;
  // Window wraps midnight, e.g. 22 -> 7
  return hour >= quietStart || hour < quietEnd;
}

export function sanitizeNotifyService(service: string): string {
  const cleaned = service
    .trim()
    .toLowerCase()
    .replace(/^notify\./, "")
    .replace(/[^a-z0-9_]/g, "");
  return cleaned || "persistent_notification";
}

function buildMessage(task: { title: string; dueDate: string }, plantName: string | null, today: string): string {
  const subject = plantName ? `${task.title} (${plantName})` : task.title;
  if (task.dueDate < today) return `${subject} is overdue since ${task.dueDate}.`;
  return `${subject} is due today.`;
}

async function callHaNotify(baseUrl: string, token: string, service: string, message: string) {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/services/notify/${service}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: NOTIFY_TITLE, message }),
  });
  if (!res.ok) {
    throw new Error(`HA notify service returned ${res.status}`);
  }
}

/**
 * Sends one HA notification per due/overdue task per day.
 * Called from GET /api/tasks; fail-safe by design: never throws.
 * Quiet hours defer (not drop) sends; dedup is date-based on the task row.
 */
export async function sendTaskNotifications(): Promise<NotificationResult> {
  try {
    const config = await getHaConfig();
    if (config.notifyEnabled !== 1) {
      return { sent: 0, deferred: 0, skipped: true };
    }

    const today = getLocalDate();
    const service = sanitizeNotifyService(config.notifyService);
    const useMock = config.mockMode === 1 || !config.token;

    const dueTasks = db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        lastNotifiedDate: tasks.lastNotifiedDate,
        plantName: userPlants.customName,
        areaName: gardenAreas.name,
      })
      .from(tasks)
      .leftJoin(userPlants, eq(tasks.userPlantId, userPlants.id))
      .leftJoin(gardenAreas, eq(tasks.gardenAreaId, gardenAreas.id))
      .where(
        and(
          eq(tasks.completed, 0),
          lte(tasks.dueDate, today),
          or(isNull(tasks.lastNotifiedDate), ne(tasks.lastNotifiedDate, today)),
        ),
      )
      .all();

    if (dueTasks.length === 0) {
      return { sent: 0, deferred: 0, skipped: false };
    }

    if (isQuietHour(new Date().getHours(), config.quietHoursStart, config.quietHoursEnd)) {
      // Deferred, not dropped: retried on the next tasks fetch outside the quiet window.
      console.log(`[Notify] Quiet hours active — deferring ${dueTasks.length} task notification(s).`);
      return { sent: 0, deferred: dueTasks.length, skipped: false };
    }

    let sent = 0;
    for (const task of dueTasks) {
       const message = buildMessage(task, task.plantName || task.areaName, today);
      try {
        if (useMock) {
          sendMockNotification(NOTIFY_TITLE, message);
        } else {
          await callHaNotify(config.baseUrl, config.token, service, message);
        }
        db.update(tasks)
          .set({ lastNotifiedAt: new Date().toISOString(), lastNotifiedDate: today })
          .where(eq(tasks.id, task.id))
          .run();
        sent++;
      } catch (err) {
        // Fail-safe like the other HA fetch patterns: log and retry on the next request.
        console.error(`[Notify] Failed to notify task "${task.title}":`, err);
      }
    }
    return { sent, deferred: 0, skipped: false };
  } catch (err) {
    console.error("[Notify] Task notification run failed:", err);
    return { sent: 0, deferred: 0, skipped: true };
  }
}
