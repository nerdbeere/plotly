import { db } from "@/db";
import { gamification, tasks, userPlants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scheduleNextAreaOccurrence, scheduleNextOccurrence } from "@/lib/tasks/recurrence";

export function calculateLevel(xp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progressPercent: number } {
  // Level threshold: Level 1 = 0-100, Level 2 = 101-250, Level 3 = 251-450, etc.
  // Formula: XP required for level L = 50 * (L - 1) * L
  let level = 1;
  while (50 * level * (level + 1) <= xp) {
    level++;
  }

  const prevThreshold = 50 * (level - 1) * level;
  const nextThreshold = 50 * level * (level + 1);
  const currentLevelXp = xp - prevThreshold;
  const xpNeeded = nextThreshold - prevThreshold;
  const progressPercent = Math.min(100, Math.round((currentLevelXp / xpNeeded) * 100));

  return {
    level,
    currentLevelXp,
    nextLevelXp: xpNeeded,
    progressPercent,
  };
}

export async function getGamificationState() {
  let profile = db.select().from(gamification).where(eq(gamification.id, 1)).get();
  if (!profile) {
    profile = db
      .insert(gamification)
      .values({
        id: 1,
        totalXp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        updatedAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  const levelInfo = calculateLevel(profile.totalXp);
  return {
    ...profile,
    ...levelInfo,
  };
}

export async function completeTaskWithReward(taskId: number) {
  const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
  if (!task) {
    throw new Error("Task not found");
  }

  if (task.completed === 1) {
    return { alreadyCompleted: true };
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const nowIso = now.toISOString();

  // Mark task completed
  db.update(tasks)
    .set({
      completed: 1,
      completedAt: nowIso,
    })
    .where(eq(tasks.id, taskId))
    .run();

  // If task has associated user plant, update plant's lastWateredAt / lastFertilizedAt
  if (task.userPlantId) {
    if (task.taskType === "water") {
      db.update(userPlants).set({ lastWateredAt: todayStr }).where(eq(userPlants.id, task.userPlantId)).run();
    } else if (task.taskType === "fertilize") {
      db.update(userPlants).set({ lastFertilizedAt: todayStr }).where(eq(userPlants.id, task.userPlantId)).run();
    }
  }

  // Recurring care schedule: queue the next occurrence for water/fertilize tasks
  const scheduledNext = (await scheduleNextOccurrence({ userPlantId: task.userPlantId, taskType: task.taskType }, now)) || scheduleNextAreaOccurrence({ gardenAreaId: task.gardenAreaId, taskType: task.taskType }, now);

  // Update gamification stats
  let profile = await getGamificationState();
  const prevLevel = profile.level;

  let newStreak = profile.currentStreak;
  if (!profile.lastActiveDate) {
    newStreak = 1;
  } else if (profile.lastActiveDate === todayStr) {
    // Already active today, streak remains
  } else {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (profile.lastActiveDate === yesterdayStr) {
      newStreak += 1;
    } else {
      newStreak = 1; // Streak broken, restart
    }
  }

  const longestStreak = Math.max(profile.longestStreak, newStreak);
  const earnedXp = task.xpReward;
  const newTotalXp = profile.totalXp + earnedXp;
  const newLevelInfo = calculateLevel(newTotalXp);

  db.update(gamification)
    .set({
      totalXp: newTotalXp,
      level: newLevelInfo.level,
      currentStreak: newStreak,
      longestStreak: longestStreak,
      lastActiveDate: todayStr,
      updatedAt: nowIso,
    })
    .where(eq(gamification.id, 1))
    .run();

  const leveledUp = newLevelInfo.level > prevLevel;

  return {
    taskId,
    earnedXp,
    leveledUp,
    newLevel: newLevelInfo.level,
    newTotalXp,
    currentStreak: newStreak,
    progressPercent: newLevelInfo.progressPercent,
    scheduledNext,
  };
}
