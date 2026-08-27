import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const plants = sqliteTable("plants", {
  id: text("id").primaryKey(), // e.g. "tomato", "basil"
  name: text("name").notNull(),
  scientificName: text("scientific_name"),
  category: text("category").notNull(), // vegetable, herb, fruit, flower
  description: text("description").notNull(),
  icon: text("icon").notNull().default("leaf"),
  waterIntervalDays: integer("water_interval_days").notNull().default(3),
  fertilizeIntervalDays: integer("fertilize_interval_days").notNull().default(14),
  sunlight: text("sunlight").notNull().default("full_sun"), // full_sun, partial_shade, full_shade
  difficulty: text("difficulty").notNull().default("easy"), // easy, medium, hard
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const userPlants = sqliteTable("user_plants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  plantId: text("plant_id").notNull().references(() => plants.id),
  customName: text("custom_name").notNull(),
  location: text("location").notNull().default("Main Garden Bed"),
  plantedAt: text("planted_at").notNull().$defaultFn(() => new Date().toISOString().split("T")[0]),
  lastWateredAt: text("last_watered_at"),
  lastFertilizedAt: text("last_fertilized_at"),
  health: text("health").notNull().default("good"), // thriving, good, needs_attention
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userPlantId: integer("user_plant_id").references(() => userPlants.id),
  title: text("title").notNull(),
  taskType: text("task_type").notNull(), // water, fertilize, prune, harvest, weed, custom
  dueDate: text("due_date").notNull(), // YYYY-MM-DD
  completed: integer("completed").notNull().default(0),
  completedAt: text("completed_at"),
  xpReward: integer("xp_reward").notNull().default(10),
  lastNotifiedAt: text("last_notified_at"), // ISO timestamp of last HA notification
  lastNotifiedDate: text("last_notified_date"), // YYYY-MM-DD, dedup: one notification per task per day
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const gamification = sqliteTable("gamification", {
  id: integer("id").primaryKey().default(1),
  totalXp: integer("total_xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: text("last_active_date"), // YYYY-MM-DD
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const badges = sqliteTable("badges", {
  id: text("id").primaryKey(),
  earnedAt: text("earned_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const haSettings = sqliteTable("ha_settings", {
  id: integer("id").primaryKey().default(1),
  baseUrl: text("base_url").notNull().default("http://homeassistant.local:8123"),
  token: text("token").notNull().default(""),
  mockMode: integer("mock_mode").notNull().default(1), // 1 = true, 0 = false
  weatherEntityId: text("weather_entity_id").notNull().default("weather.forecast_home"),
  rainSensorEntityId: text("rain_sensor_entity_id").notNull().default("binary_sensor.rain_sensor"),
  moistureEntities: text("moisture_entities").notNull().default("[]"), // JSON string
  moistureEntityLocations: text("moisture_entity_locations").notNull().default("{}"), // JSON string: entity_id -> garden location
  notifyEnabled: integer("notify_enabled").notNull().default(0), // 1 = task notifications enabled, 0 = off (default)
  notifyService: text("notify_service").notNull().default("persistent_notification"), // HA notify target, e.g. "persistent_notification" or "mobile_app_phone"
  quietHoursStart: integer("quiet_hours_start").notNull().default(22), // local hour 0-23, inclusive start of quiet window
  quietHoursEnd: integer("quiet_hours_end").notNull().default(7), // local hour 0-23, exclusive end of quiet window
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const soilMoistureReadings = sqliteTable("soil_moisture_readings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityId: text("entity_id").notNull(),
  name: text("name").notNull(),
  moisturePercent: integer("moisture_percent").notNull(),
  recordedAt: text("recorded_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type Plant = typeof plants.$inferSelect;
export type UserPlant = typeof userPlants.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Gamification = typeof gamification.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type HaSettings = typeof haSettings.$inferSelect;
export type SoilMoistureReadingRecord = typeof soilMoistureReadings.$inferSelect;
