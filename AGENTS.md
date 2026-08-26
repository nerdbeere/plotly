# Autonomous Development Agent Guide (`AGENTS.md`)

This repository is designed for autonomous development by `looper`. Use this guide to understand project conventions, local development harnesses, visual inspection protocols, and task management.

---

## 1. Project Overview & Architecture
- **Application:** GardenPlot - Smart Garden Manager
- **Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS
- **Database:** SQLite with Drizzle ORM (`src/db/schema.ts`, `garden.db`)
- **Sensors:** Home Assistant REST API client (`src/lib/ha/client.ts`) with built-in Mock Mode (`src/lib/ha/mock.ts`)
- **Gamification:** XP & daily streak calculations (`src/lib/gamification/engine.ts`)
- **GitHub Board:** [Project Board #1](https://github.com/users/nerdbeere/projects/1) on repository `nerdbeere/plotly`
- **Deployment Target:** VM `192.168.1.12` using SSH key `/Users/hol0008j/.ssh/plotly`

---

## 2. Autonomous Loop Cycle & Project Board Tracking

Progress is tracked on [GitHub Project Board #1](https://github.com/users/nerdbeere/projects/1).

Whenever you pick up a task:
1. **Find Task on Board / Issues:**
   - List open tasks on the project board or repo:
     ```bash
     gh project item-list 1 --owner nerdbeere --format json
     # Or query issues directly:
     gh issue list --repo nerdbeere/plotly --state open
     ```
   - Select the next open task/issue.
2. **Move Card to `In Progress`:**
   - Assign the issue to yourself: `gh issue edit <id> --add-assignee "@me"`
   - Add/update the card status to `In Progress` on Project Board #1:
     ```bash
     gh project item-edit --project-id 1 --id <item-id> --field-id <status-field-id> --single-select-option-id <in-progress-id>
     ```
   - Post a comment on the issue acknowledging that autonomous work is in progress.
3. **Scaffold / Edit Code:** Follow existing directory patterns in `src/`.
4. **Self-Verification Loop:**
   - Run type check & build: `npm run build`
   - Seed or migrate DB if schema changed: `npm run db:seed`
   - Start background server if not already running: `npm run dev &`
   - Inspect API health: `curl -s http://localhost:3000/api/health`
   - Inspect UI using Browser CLI (`agent-browser` or Playwright) and capture mandatory screenshots.
5. **Move Card to `Done` & Close:**
   - Commit changes with a concise conventional commit message.
   - Push to `main` or create a PR.
   - Close the issue and move the board item to `Done`:
     ```bash
     gh issue close <id> --comment "Implemented and visually verified. Moving card to Done."
     ```

---

## 3. Essential Terminal Commands

### Dev Server & Health Checks
```bash
# Start Next.js development server
npm run dev

# Verify application health and database connection
curl -s http://localhost:3000/api/health
```

### Database Management (Drizzle & SQLite)
```bash
# Push schema updates to SQLite database
npm run db:push

# Seed default plant catalog, initial game state, and sample garden
npm run db:seed

# Inspect database visually (starts web UI)
npm run db:studio
```

### Verification & Builds
```bash
# Full TypeScript build & route verification
npm run build
```

---

## 4. UI & Visual Inspection (Browser CLI & Mandatory Screenshots)

Whenever UI or frontend components are changed:
1. **Take Screenshots:** You MUST capture screenshots of the affected pages before completing the task.
   - Save screenshots to `.screenshots/issue-<id>-<page-name>.png`
   - Example using `agent-browser`:
     ```bash
     agent-browser open http://localhost:3000/
     agent-browser screenshot .screenshots/dashboard.png
     ```
   - Or using Playwright CLI / npx:
     ```bash
     npx playwright screenshot --wait-for-timeout=1000 http://localhost:3000/ .screenshots/dashboard.png
     ```
2. **Visual Verification Rules:**
   - Inspect the saved image or DOM elements to confirm layout, colors, responsiveness, and typography.
   - Verify that interactive elements (buttons, modals, forms) open and submit cleanly.
   - Attach or reference the screenshot in the GitHub issue closing comment or PR description.

- **Key Routes to Inspect:**
  - `/` (Dashboard: Weather summary, daily tasks, XP bar)
  - `/plants` (My Garden: Plant list, plant details, Add Plant modal)
  - `/reminders` (Tasks: Pending list, custom reminder creation, complete actions)
  - `/settings` (Home Assistant: URL, token, mock mode switch, entity mappings)

---

## 5. Home Assistant Integration Rules
- By default, `mockMode` is enabled (`1`) in the database so local runs and agent loops operate reliably without network dependencies.
- When live credentials are provided via `/settings`, the client queries `/api/states/<entity_id>` with the Bearer token.
- Always ensure mock fallbacks exist for any newly added sensor types.

---

## 6. Remote VM Access & Deployment
- **Target Host:** `192.168.1.12`
- **SSH Key:** `/Users/hol0008j/.ssh/plotly`
- **Example SSH Command:**
  ```bash
  ssh -i /Users/hol0008j/.ssh/plotly user@192.168.1.12
  ```
- **Example Sync Command:**
  ```bash
  rsync -avz -e "ssh -i /Users/hol0008j/.ssh/plotly" --exclude 'node_modules' --exclude '.next' --exclude 'garden.db' . user@192.168.1.12:/opt/garden-tracker/
  ```
