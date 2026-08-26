#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-garden-tracker}"
APP_DIR="${APP_DIR:-/opt/garden-tracker}"
CONFIG_DIR="${CONFIG_DIR:-/etc/garden-tracker}"
SERVICE_NAME="garden-tracker.service"

if [[ "$(id -u)" -ne 0 ]]; then
  printf 'Run this script as root.\n' >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    apt-get install -y nodejs npm
  else
    printf 'Node.js and npm are required. Install a supported Node.js LTS release first.\n' >&2
    exit 1
  fi
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
fi

install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "$APP_DIR"
install -d -o root -g "$APP_USER" -m 0750 "$CONFIG_DIR"
install -m 0644 "$(dirname "$0")/../deploy/$SERVICE_NAME" "/etc/systemd/system/$SERVICE_NAME"

if [[ ! -e "$CONFIG_DIR/garden-tracker.env" ]]; then
  install -o root -g "$APP_USER" -m 0640 /dev/null "$CONFIG_DIR/garden-tracker.env"
fi

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
printf 'VM prepared for GardenPlot in %s.\n' "$APP_DIR"
printf 'Set runtime values in %s before the first deployment.\n' "$CONFIG_DIR/garden-tracker.env"
