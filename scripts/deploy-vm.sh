#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${DEPLOY_HOST:-192.168.1.12}"
REMOTE_USER="${DEPLOY_USER:-root}"
SSH_KEY="${DEPLOY_SSH_KEY:-/Users/hol0008j/.ssh/plotly}"
APP_DIR="${APP_DIR:-/opt/garden-tracker}"
SERVICE_NAME="garden-tracker.service"
HEALTH_PORT="${HEALTH_PORT:-3000}"
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

# Ship sources to a staging dir on the VM first.
remote "sudo install -d -o garden-tracker -g garden-tracker -m 0750 /tmp/garden-tracker-release"
rsync -az --delete \
  --exclude '.git' \
  --exclude '.github' \
  --exclude '.next' \
  --exclude 'node_modules' \
  --exclude 'garden.db' \
  --exclude 'garden.db-*' \
  -e "ssh ${SSH_OPTS[*]}" ./ "$REMOTE_USER@$REMOTE_HOST:/tmp/garden-tracker-release/"

# Swap in sources, install, build while the old service keeps serving.
# Then stop the service, back up the DB, migrate, start, and health-gate.
remote "APP_DIR='$APP_DIR' SERVICE_NAME='$SERVICE_NAME' HEALTH_PORT='$HEALTH_PORT' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

echo '==> Installing release into APP_DIR'
# The staging dir carries no database (excluded from the first rsync), so
# --delete here must not prune it either: excludes keep the live DB, its WAL/
# SHM sidecars, and prior backups in APP_DIR across deployments.
sudo rsync -a --delete \
  --exclude='garden.db' \
  --exclude='garden.db-*' \
  --exclude='garden.db.bak-*' \
  /tmp/garden-tracker-release/ "$APP_DIR/"
sudo chown -R garden-tracker:garden-tracker "$APP_DIR"
sudo rm -rf /tmp/garden-tracker-release
cd "$APP_DIR"

echo '==> Installing dependencies (matches lockfile via package-lock)'
sudo -u garden-tracker npm install

echo '==> Ensuring Tailwind oxide native binding (linux-x64)'
TW_VERSION="$(node -p "require('./node_modules/tailwindcss/package.json').version" 2>/dev/null || true)"
if [[ -z "$TW_VERSION" ]]; then
  echo 'tailwindcss is not installed; cannot align oxide binding.' >&2
  exit 1
fi
# npm <10 has a reification bug (npm/cli#4828): platform-specific optional
# dependencies listed in the lockfile are silently skipped, and a follow-up
# "npm install --no-save" no-ops claiming the tree is up to date. Verify the
# binding actually loads; if not, place it from the registry tarball directly.
if sudo -u garden-tracker node -e "require('@tailwindcss/oxide')" >/dev/null 2>&1; then
  echo 'Oxide native binding present.'
else
  BINDING_TGZ="tailwindcss-oxide-linux-x64-gnu-$TW_VERSION.tgz"
  TMPB="$(mktemp -d)"
  npm pack "@tailwindcss/oxide-linux-x64-gnu@$TW_VERSION" --pack-destination "$TMPB" >/dev/null
  tar -xzf "$TMPB/$BINDING_TGZ" -C "$TMPB"
  rm -rf "node_modules/@tailwindcss/oxide-linux-x64-gnu"
  cp -r "$TMPB/package" "node_modules/@tailwindcss/oxide-linux-x64-gnu"
  chown -R garden-tracker:garden-tracker "node_modules/@tailwindcss/oxide-linux-x64-gnu"
  rm -rf "$TMPB"
  echo 'Oxide native binding extracted from registry tarball.'
fi
sudo -u garden-tracker node -e "require('@tailwindcss/oxide')" || {
  echo 'Tailwind oxide native binding is still not loadable.' >&2
  exit 1
}

echo '==> Building application'
sudo -u garden-tracker npm run build

echo "==> Stopping $SERVICE_NAME"
sudo systemctl stop "$SERVICE_NAME"

echo '==> Backing up SQLite database before schema push'
if sudo test -f "$APP_DIR/garden.db"; then
  DB_BAK="garden.db.bak-$(date +%Y%m%d-%H%M%S)"
  sudo sh -c "cd '$APP_DIR' && node -e \"const db=require('better-sqlite3')('garden.db');(async()=>{await db.backup('$DB_BAK');db.close();console.log('Backup written:','$DB_BAK');})().catch(e=>{console.error(e.message);process.exit(1);})\""
  sudo chown garden-tracker:garden-tracker "$APP_DIR/$DB_BAK"
fi

echo '==> Applying schema (db:push)'
sudo -u garden-tracker npm run db:push

echo '==> Seeding database (idempotent)'
sudo -u garden-tracker npm run db:seed

echo "==> Starting $SERVICE_NAME"
sudo systemctl start "$SERVICE_NAME"

echo '==> Health check (up to 30s)'
HEALTH_OK=0
for _ in $(seq 1 10); do
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS "http://127.0.0.1:$HEALTH_PORT/api/health" >/dev/null 2>&1; then
      echo 'Health endpoint OK.'
      HEALTH_OK=1
      break
    fi
  else
    if node -e "require('http').get('http://127.0.0.1:$HEALTH_PORT/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"; then
      echo 'Health endpoint OK.'
      HEALTH_OK=1
      break
    fi
  fi
  sleep 3
done
if [[ "$HEALTH_OK" -ne 1 ]]; then
  printf 'Health check failed after restart.\n' >&2
  exit 1
fi

# A green /api/health does not prove the UI works: `next start` serves HTML from
# in-memory manifests but static assets from disk, so a stale process can pass
# health while every page renders unstyled. Verify every referenced asset.
echo '==> Verifying static assets referenced by the app pages'
node <<'NODE_SCRIPT'
const http = require('http');
const port = process.env.HEALTH_PORT || '3000';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, contentType: res.headers['content-type'] || '', body }));
    }).on('error', reject);
  });
}

(async () => {
  const pages = ['/', '/plants', '/reminders', '/settings'];
  const assets = new Set();
  for (const page of pages) {
    const res = await get(page);
    if (res.status !== 200) throw new Error(`Page ${page} returned HTTP ${res.status}`);
    for (const m of res.body.matchAll(/\/_next\/static\/[^"'\s\\>]+/g)) assets.add(m[0]);
  }
  if (assets.size === 0) throw new Error('No /_next/static assets found in page HTML');
  for (const asset of assets) {
    const res = await get(asset);
    if (res.status !== 200) throw new Error(`Asset ${asset} returned HTTP ${res.status}`);
    if (asset.endsWith('.css') && !res.contentType.includes('text/css')) {
      throw new Error(`Asset ${asset} has content-type "${res.contentType}", expected text/css`);
    }
  }
  console.log(`Verified ${assets.size} static assets across ${pages.length} pages (all HTTP 200, CSS content-type OK).`);
})().catch((err) => {
  console.error(`Static asset verification failed: ${err.message}`);
  process.exit(1);
});
NODE_SCRIPT
REMOTE_SCRIPT

printf 'GardenPlot deployed to %s:%s.\n' "$REMOTE_HOST" "$APP_DIR"
