import { db, sqlite } from "./index";
import { plants, userPlants, tasks, gamification, haSettings } from "./schema";
import { eq } from "drizzle-orm";

export async function seed() {
  console.log("🌱 Running database migrations / table creations...");
  
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS plants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      scientific_name TEXT,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'leaf',
      water_interval_days INTEGER NOT NULL DEFAULT 3,
      fertilize_interval_days INTEGER NOT NULL DEFAULT 14,
      sunlight TEXT NOT NULL DEFAULT 'full_sun',
      difficulty TEXT NOT NULL DEFAULT 'easy',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_plants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plant_id TEXT NOT NULL REFERENCES plants(id),
      custom_name TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT 'Main Garden Bed',
      planted_at TEXT NOT NULL,
      last_watered_at TEXT,
      last_fertilized_at TEXT,
      health TEXT NOT NULL DEFAULT 'good',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_plant_id INTEGER REFERENCES user_plants(id),
      title TEXT NOT NULL,
      task_type TEXT NOT NULL,
      due_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      xp_reward INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gamification (
      id INTEGER PRIMARY KEY DEFAULT 1,
      total_xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_active_date TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      earned_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ha_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      base_url TEXT NOT NULL DEFAULT 'http://homeassistant.local:8123',
      token TEXT NOT NULL DEFAULT '',
      mock_mode INTEGER NOT NULL DEFAULT 1,
      weather_entity_id TEXT NOT NULL DEFAULT 'weather.forecast_home',
      rain_sensor_entity_id TEXT NOT NULL DEFAULT 'binary_sensor.rain_sensor',
      moisture_entities TEXT NOT NULL DEFAULT '[]',
      moisture_entity_locations TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS soil_moisture_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL,
      name TEXT NOT NULL,
      moisture_percent INTEGER NOT NULL,
      recorded_at TEXT NOT NULL
    );

  `);

  // Migrate existing databases: add moisture entity location mapping column
  try {
    sqlite.exec(`ALTER TABLE ha_settings ADD COLUMN moisture_entity_locations TEXT NOT NULL DEFAULT '{}'`);
    console.log("🧩 Added moisture_entity_locations column to ha_settings");
  } catch {
    // Column already exists
  }

  console.log("🌿 Seeding Plant Catalog...");

  const defaultPlants = [
    {
      id: "tomato",
      name: "Roma Tomato",
      scientificName: "Solanum lycopersicum",
      category: "vegetable",
      description: "Popular compact tomato great for sauces and salads. Needs consistent watering.",
      icon: "tomato",
      waterIntervalDays: 2,
      fertilizeIntervalDays: 14,
      sunlight: "full_sun",
      difficulty: "easy",
    },
    {
      id: "basil",
      name: "Sweet Basil",
      scientificName: "Ocimum basilicum",
      category: "herb",
      description: "Fragrant herb essential for Mediterranean dishes. Loves warmth and moist soil.",
      icon: "leaf",
      waterIntervalDays: 2,
      fertilizeIntervalDays: 21,
      sunlight: "full_sun",
      difficulty: "easy",
    },
    {
      id: "mint",
      name: "Spearmint",
      scientificName: "Mentha spicata",
      category: "herb",
      description: "Fast-growing aromatic herb. Ideal for teas and garnishes. Keep in pots to prevent spreading.",
      icon: "leaf",
      waterIntervalDays: 3,
      fertilizeIntervalDays: 30,
      sunlight: "partial_shade",
      difficulty: "easy",
    },
    {
      id: "rosemary",
      name: "Tuscan Rosemary",
      scientificName: "Salvia rosmarinus",
      category: "herb",
      description: "Hardy perennial shrub with pine-scented needles. Prefers well-drained, drier soil.",
      icon: "leaf",
      waterIntervalDays: 6,
      fertilizeIntervalDays: 45,
      sunlight: "full_sun",
      difficulty: "easy",
    },
    {
      id: "strawberry",
      name: "Garden Strawberry",
      scientificName: "Fragaria ananassa",
      category: "fruit",
      description: "Sweet, juicy berries produced throughout early summer. Needs rich soil and regular watering.",
      icon: "flower",
      waterIntervalDays: 3,
      fertilizeIntervalDays: 14,
      sunlight: "full_sun",
      difficulty: "medium",
    },
    {
      id: "bell_pepper",
      name: "Sweet Bell Pepper",
      scientificName: "Capsicum annuum",
      category: "vegetable",
      description: "Crisp and colorful peppers. Enjoys warm weather, regular feeding, and even moisture.",
      icon: "leaf",
      waterIntervalDays: 3,
      fertilizeIntervalDays: 14,
      sunlight: "full_sun",
      difficulty: "medium",
    },
    {
      id: "carrot",
      name: "Nantes Carrot",
      scientificName: "Daucus carota",
      category: "vegetable",
      description: "Sweet root vegetable that loves deep, loose soil free of stones.",
      icon: "leaf",
      waterIntervalDays: 4,
      fertilizeIntervalDays: 28,
      sunlight: "full_sun",
      difficulty: "medium",
    },
    {
      id: "lettuce",
      name: "Butterhead Lettuce",
      scientificName: "Lactuca sativa",
      category: "vegetable",
      description: "Tender leafy green that thrives in cooler spring and autumn temperatures.",
      icon: "leaf",
      waterIntervalDays: 2,
      fertilizeIntervalDays: 21,
      sunlight: "partial_shade",
      difficulty: "easy",
    },
    {
      id: "cucumber",
      name: "Marketmore Cucumber",
      scientificName: "Cucumis sativus",
      category: "vegetable",
      description: "Fast-growing vine that needs steady moisture, rich soil, and a trellis for clean fruit.",
      icon: "leaf",
      waterIntervalDays: 2,
      fertilizeIntervalDays: 14,
      sunlight: "full_sun",
      difficulty: "medium",
    },
    {
      id: "zucchini",
      name: "Black Beauty Zucchini",
      scientificName: "Cucurbita pepo",
      category: "vegetable",
      description: "Productive summer squash. Harvest young fruit often and give the broad leaves plenty of room.",
      icon: "leaf",
      waterIntervalDays: 3,
      fertilizeIntervalDays: 21,
      sunlight: "full_sun",
      difficulty: "easy",
    },
    {
      id: "cherry_tomato",
      name: "Cherry Tomato",
      scientificName: "Solanum lycopersicum var. cerasiforme",
      category: "fruit",
      description: "Sun-loving producer that benefits from a sturdy support, deep watering, and regular suckering.",
      icon: "tomato",
      waterIntervalDays: 2,
      fertilizeIntervalDays: 14,
      sunlight: "full_sun",
      difficulty: "medium",
    },
    {
      id: "parsley",
      name: "Italian Parsley",
      scientificName: "Petroselinum crispum neapolitanum",
      category: "herb",
      description: "Long-season herb for containers or beds. Keep soil evenly moist and harvest outer stems first.",
      icon: "leaf",
      waterIntervalDays: 3,
      fertilizeIntervalDays: 30,
      sunlight: "partial_shade",
      difficulty: "easy",
    },
    {
      id: "thyme",
      name: "Common Thyme",
      scientificName: "Thymus vulgaris",
      category: "herb",
      description: "Compact, drought-tolerant herb. Use gritty, well-drained soil and let the surface dry between watering.",
      icon: "leaf",
      waterIntervalDays: 7,
      fertilizeIntervalDays: 45,
      sunlight: "full_sun",
      difficulty: "easy",
    },
    {
      id: "marigold",
      name: "French Marigold",
      scientificName: "Tagetes patula",
      category: "flower",
      description: "Bright annual that flowers longer when spent blooms are removed. Avoid keeping its foliage constantly wet.",
      icon: "flower",
      waterIntervalDays: 4,
      fertilizeIntervalDays: 30,
      sunlight: "full_sun",
      difficulty: "easy",
    },
    {
      id: "nasturtium",
      name: "Trailing Nasturtium",
      scientificName: "Tropaeolum majus",
      category: "flower",
      description: "Edible flower with vivid blooms. It prefers lean soil, moderate watering, and afternoon shade in hot weather.",
      icon: "flower",
      waterIntervalDays: 4,
      fertilizeIntervalDays: 45,
      sunlight: "partial_shade",
      difficulty: "easy",
    },
    {
      id: "sunflower",
      name: "Dwarf Sunflower",
      scientificName: "Helianthus annuus",
      category: "flower",
      description: "Reliable pollinator plant. Water deeply while young, stake tall stems, and leave seed heads for birds.",
      icon: "flower",
      waterIntervalDays: 3,
      fertilizeIntervalDays: 30,
      sunlight: "full_sun",
      difficulty: "easy",
    },
  ];

  for (const plant of defaultPlants) {
    const existing = db.select().from(plants).where(eq(plants.id, plant.id)).get();
    if (!existing) {
      db.insert(plants).values({
        ...plant,
        createdAt: new Date().toISOString(),
      }).run();
    } else {
      db.update(plants).set({
        name: plant.name,
        scientificName: plant.scientificName,
        category: plant.category,
        description: plant.description,
        icon: plant.icon,
        waterIntervalDays: plant.waterIntervalDays,
        fertilizeIntervalDays: plant.fertilizeIntervalDays,
        sunlight: plant.sunlight,
        difficulty: plant.difficulty,
      }).where(eq(plants.id, plant.id)).run();
    }
  }

  // Seed initial gamification state if missing
  const existingGame = db.select().from(gamification).where(eq(gamification.id, 1)).get();
  if (!existingGame) {
    db.insert(gamification).values({
      id: 1,
      totalXp: 50,
      level: 1,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString(),
    }).run();
  }

  // Seed default Home Assistant settings if missing
  const existingHa = db.select().from(haSettings).where(eq(haSettings.id, 1)).get();
  if (!existingHa) {
    db.insert(haSettings).values({
      id: 1,
      baseUrl: "http://homeassistant.local:8123",
      token: "",
      mockMode: 1,
      weatherEntityId: "weather.forecast_home",
      rainSensorEntityId: "binary_sensor.rain_sensor",
      moistureEntities: JSON.stringify(["sensor.soil_moisture_bed_1", "sensor.soil_moisture_balcony_pot"]),
      moistureEntityLocations: "{}",
      updatedAt: new Date().toISOString(),
    }).run();
  }

  // Check if sample user plants exist
  const existingUserPlants = db.select().from(userPlants).all();
  if (existingUserPlants.length === 0) {
    console.log("🪴 Seeding starter garden plants & tasks...");
    const today = new Date().toISOString().split("T")[0];
    
    const plant1 = db.insert(userPlants).values({
      plantId: "tomato",
      customName: "Cherry Tomato #1",
      location: "Sunny Patio Pot",
      plantedAt: today,
      lastWateredAt: today,
      health: "thriving",
      notes: "First flower cluster appearing",
      createdAt: new Date().toISOString(),
    }).returning().get();

    const plant2 = db.insert(userPlants).values({
      plantId: "basil",
      customName: "Genovese Basil",
      location: "Herb Window Box",
      plantedAt: today,
      lastWateredAt: today,
      health: "good",
      notes: "Pinch top leaves weekly",
      createdAt: new Date().toISOString(),
    }).returning().get();

    // Create starter tasks
    db.insert(tasks).values([
      {
        userPlantId: plant1.id,
        title: "Water Cherry Tomato",
        taskType: "water",
        dueDate: today,
        completed: 0,
        xpReward: 10,
        createdAt: new Date().toISOString(),
      },
      {
        userPlantId: plant2.id,
        title: "Pinch top flowers on Basil",
        taskType: "prune",
        dueDate: today,
        completed: 0,
        xpReward: 15,
        createdAt: new Date().toISOString(),
      },
    ]).run();
  }

  console.log("✅ Seed completed successfully!");
}

// Run if called directly via CLI
if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed error:", err);
      process.exit(1);
    });
}
