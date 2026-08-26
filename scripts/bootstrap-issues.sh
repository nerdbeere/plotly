#!/usr/bin/env bash
set -e

REPO="nerdbeere/plotly"

echo "Creating initial task issues in $REPO..."

gh issue create --repo "$REPO" \
  --title "🌱 Epic: Plant Catalog & Care Schedule Presets" \
  --body "Expand preset database of herbs, vegetables, and flowers with specific watering intervals, sunlight requirements, and care instructions." \
  --label "enhancement" || true

gh issue create --repo "$REPO" \
  --title "📊 Feature: Soil Moisture Telemetry Graphs" \
  --body "Add historical moisture graphs and alerts when moisture drops below optimal levels using Home Assistant telemetry." \
  --label "enhancement" || true

gh issue create --repo "$REPO" \
  --title "🏆 Feature: Gamification Badges & Achievement System" \
  --body "Implement milestone badges (e.g. 'Green Thumb', '7-Day Watering Streak', 'Harvest Hero') and reward animations." \
  --label "enhancement" || true

gh issue create --repo "$REPO" \
  --title "🌧️ Automation: Skip Watering on Rain Forecast" \
  --body "Automatically postpone due watering reminders when Home Assistant rain sensor detects precipitation or rain forecast exceeds threshold." \
  --label "enhancement" || true

gh issue create --repo "$REPO" \
  --title "🚀 Deployment: Automate VM Sync & Systemd Runner" \
  --body "Create systemd service file and deploy script for hosting on 192.168.1.12 with automatic restarts." \
  --label "infrastructure" || true

echo "✅ Backlog issues created successfully!"
