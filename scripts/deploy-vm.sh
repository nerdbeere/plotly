#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${DEPLOY_HOST:-192.168.1.12}"
REMOTE_USER="${DEPLOY_USER:-user}"
SSH_KEY="${DEPLOY_SSH_KEY:-/Users/hol0008j/.ssh/plotly}"
APP_DIR="${APP_DIR:-/opt/garden-tracker}"
SSH_OPTS=(-o BatchMode=yes)

if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  SSH_OPTS=(-i "$SSH_KEY" "${SSH_OPTS[@]}")
elif [[ -r "$SSH_KEY" ]]; then
  SSH_OPTS=(-i "$SSH_KEY" "${SSH_OPTS[@]}")
elif ! ssh-add -l >/dev/null 2>&1; then
  printf 'SSH key is not readable: %s\n' "$SSH_KEY" >&2
  exit 1
fi

remote() {
  ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" "$@"
}

remote "sudo install -d -o garden-tracker -g garden-tracker -m 0750 '$APP_DIR'"
rsync -az --delete \
  --exclude '.git' \
  --exclude '.github' \
  --exclude '.next' \
  --exclude 'node_modules' \
  --exclude 'garden.db' \
  --exclude 'garden.db-*' \
  -e "ssh ${SSH_OPTS[*]}" ./ "$REMOTE_USER@$REMOTE_HOST:/tmp/garden-tracker-release/"

remote "sudo rsync -a --delete /tmp/garden-tracker-release/ '$APP_DIR/' && sudo chown -R garden-tracker:garden-tracker '$APP_DIR' && sudo rm -rf /tmp/garden-tracker-release && cd '$APP_DIR' && sudo -u garden-tracker npm ci && sudo -u garden-tracker npm run build && sudo -u garden-tracker npm run db:push && sudo systemctl restart garden-tracker.service && sudo systemctl is-active --quiet garden-tracker.service"
printf 'GardenPlot deployed to %s:%s.\n' "$REMOTE_HOST" "$APP_DIR"
