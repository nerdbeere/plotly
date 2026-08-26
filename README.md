# 🌱 GardenPlot — Smart Garden Manager

> A web-based garden management assistant that schedules plant care reminders, integrates with Home Assistant sensors, and motivates gardeners through gamification (XP & daily streaks) — built for autonomous agent development.

🔗 **Deployed Instance (Local LAN):** [http://192.168.1.12:3000](http://192.168.1.12:3000)  
🐙 **Repository:** [https://github.com/nerdbeere/plotly](https://github.com/nerdbeere/plotly)  
📋 **Project Board:** [https://github.com/users/nerdbeere/projects/1](https://github.com/users/nerdbeere/projects/1)

---

## 🌟 Key Features

### 🌿 Plant Catalog & Garden Tracker
- **Plant Catalog:** Pre-seeded library of popular vegetables, herbs, and fruits (Tomatoes, Basil, Mint, Rosemary, Strawberries, and more) with default watering and fertilizing intervals.
- **My Garden Beds:** Track active plants by custom nicknames, physical bed locations (e.g., *Raised Bed 1*, *Sunny Patio Pot*), health status, and planting dates.

### ⏰ Smart Care Reminders & Tasks
- **Automatic Scheduling:** Care tasks generated automatically upon planting based on preset intervals.
- **Custom Tasks:** Create custom reminders for weeding, pruning, harvesting, or fertilizing.
- **Task Actions:** Mark tasks as complete with instant feedback and historical logging.

### 🎮 Gamification (XP & Streaks)
- **Experience Points (XP):** Earn XP for every completed gardening task (+10 XP for watering, +15 XP for pruning, etc.).
- **Level Progression:** Dynamic level scaling based on total earned XP, tracked via the real-time progress bar.
- **Daily Streak Counter:** Keeps track of consecutive active gardening days with flame indicators.

### 🏠 Home Assistant Telemetry & Mock Mode
- **REST API Integration:** Fetches live telemetry from your local Home Assistant instance for weather forecasts, rain gauge sensors, and soil moisture probes.
- **Smart Weather Awareness:** Detects active rain to highlight skippable watering routines.
- **Offline Simulation Mode:** Built-in mock data provider (`mockMode: 1`) allowing offline development and testing without requiring live Home Assistant connections.
- **UI Settings Page:** Easily configure server URLs, tokens, and entity mappings from `/settings`.

### 🤖 Autonomous Agent Harness (`looper`)
- Built specifically for continuous autonomous iteration via `looper`.
- Includes complete developer protocols, health check endpoints (`/api/health`), and screenshot verification guidelines in [`AGENTS.md`](./AGENTS.md).

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) |
| **Database & ORM** | [SQLite](https://sqlite.org/) (`better-sqlite3`, WAL mode) + [Drizzle ORM](https://orm.drizzle.team/) |
| **Home Automation** | [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/) |
| **CI / CD & Releases** | GitHub Actions + Semantic Release |

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/nerdbeere/plotly.git
cd plotly
npm install
```

### 2. Initialize Database & Seed Presets
```bash
# Push schema and seed default plant catalog + game state
npm run db:seed
```

### 3. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Health Check
```bash
curl -s http://localhost:3000/api/health | jq
```

---

## 📁 Project Structure

```
├── AGENTS.md                  # Autonomous agent development guide & rules
├── opencode.json              # Local opencode permissions & configuration
├── drizzle.config.ts          # Drizzle ORM configuration
├── src/
│   ├── app/                   # Next.js App Router routes
│   │   ├── api/               # Backend API routes (health, tasks, plants, gamification, HA)
│   │   ├── plants/            # My Garden & Catalog UI
│   │   ├── reminders/         # Task management & completed history UI
│   │   ├── settings/          # Home Assistant connection & sensor mapping UI
│   │   ├── layout.tsx         # Global layout with persistent Gamification header
│   │   └── page.tsx           # Dashboard view with weather summary & quick tasks
│   ├── components/            # UI components (Header, Navigation, WeatherWidget, etc.)
│   ├── db/                    # SQLite database schema, connection, and seed scripts
│   │   ├── schema.ts          # Drizzle tables definition
│   │   ├── index.ts           # better-sqlite3 connection client
│   │   └── seed.ts            # Default catalog & starter data seeder
│   └── lib/                   # Core business logic
│       ├── gamification/      # XP, streak, and level calculation engine
│       └── ha/                # Home Assistant REST client & mock telemetry provider
└── scripts/                   # Backlog bootstrap and automation scripts
```

---

## 🚢 VM Deployment (`192.168.1.12`)

The application is hosted locally on VM `192.168.1.12`.

### Initial VM setup

Install a supported Node.js LTS release on the VM, then run the bootstrap script as root:

```bash
sudo ./scripts/setup-vm.sh
```

The script creates the restricted `garden-tracker` service account, `/opt/garden-tracker`,
the systemd unit, and `/etc/garden-tracker/garden-tracker.env`. Set any runtime environment
values in the latter file before deploying.

### Manual deployment

The deployment script preserves the existing SQLite database, installs production dependencies,
builds the Next.js app, runs `npm run db:push`, and restarts systemd only after migration succeeds:

```bash
DEPLOY_USER=user ./scripts/deploy-vm.sh
```

GitHub Actions deploys every published release. Configure the `production` environment with
`DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_SSH_KEY` secrets. The workflow also supports a manual
run from the Actions tab.

---

## 📜 License
Private repository — All rights reserved.
