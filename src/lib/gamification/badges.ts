import { db } from "@/db";
import { badges, gamification, tasks } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";

export const BADGE_DEFINITIONS = [
  {
    id: "green-thumb",
    name: "Green Thumb",
    description: "Reach level 3 through consistent garden care.",
    icon: "leaf",
    requirement: (stats: BadgeStats) => stats.level >= 3,
  },
  {
    id: "watering-streak",
    name: "7-Day Watering Streak",
    description: "Keep a seven-day activity streak alive.",
    icon: "flame",
    requirement: (stats: BadgeStats) => stats.longestStreak >= 7,
  },
  {
    id: "harvest-hero",
    name: "Harvest Hero",
    description: "Complete five harvest tasks.",
    icon: "trophy",
    requirement: (stats: BadgeStats) => stats.harvests >= 5,
  },
] as const;

type BadgeStats = {
  level: number;
  longestStreak: number;
  harvests: number;
};

function getBadgeStats(): BadgeStats {
  const profile = db.select().from(gamification).where(eq(gamification.id, 1)).get();
  const harvests = db
    .select({ value: count() })
    .from(tasks)
    .where(and(eq(tasks.taskType, "harvest"), eq(tasks.completed, 1)))
    .get()?.value ?? 0;

  return {
    level: profile?.level ?? 1,
    longestStreak: profile?.longestStreak ?? 0,
    harvests: Number(harvests),
  };
}

export function getBadges() {
  const stats = getBadgeStats();
  const earned = new Map(db.select().from(badges).all().map((badge) => [badge.id, badge]));

  for (const definition of BADGE_DEFINITIONS) {
    if (definition.requirement(stats) && !earned.has(definition.id)) {
      const badge = db
        .insert(badges)
        .values({ id: definition.id, earnedAt: new Date().toISOString() })
        .returning()
        .get();
      earned.set(definition.id, badge);
    }
  }

  return BADGE_DEFINITIONS.map((definition) => ({
    ...definition,
    requirement: undefined,
    earned: earned.has(definition.id),
    earnedAt: earned.get(definition.id)?.earnedAt ?? null,
  }));
}
