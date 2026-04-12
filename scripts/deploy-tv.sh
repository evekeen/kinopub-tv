#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_ID="evekeen001.KinoPub"

TV_IP="192.168.8.146"
TV_WIFI="FilmLovers"
WIFI_PASS="FromSpbWithLove"

export PATH="$HOME/tizen-studio/tools:$HOME/tizen-studio/tools/ide/bin:$PATH"

ORIGINAL_WIFI=$(networksetup -getairportnetwork en0 | sed 's/Current Wi-Fi Network: //')
if [ "$ORIGINAL_WIFI" = "You are not associated with an AirPort network." ]; then
  ORIGINAL_WIFI="SunChasers"
fi
echo "Current WiFi: $ORIGINAL_WIFI"

restore_wifi() {
  if [ "$ORIGINAL_WIFI" != "$TV_WIFI" ]; then
    echo "Restoring WiFi to $ORIGINAL_WIFI..."
    for attempt in 1 2 3; do
      networksetup -setairportnetwork en0 "$ORIGINAL_WIFI" "$WIFI_PASS" 2>/dev/null || true
      for i in $(seq 1 10); do
        IP=$(ipconfig getifaddr en0 2>/dev/null || true)
        if [ -n "$IP" ] && ! echo "$IP" | grep -q "^192\.168\.8\."; then
          echo "Restored: $ORIGINAL_WIFI ($IP)"
          return
        fi
        sleep 1
      done
    done
    echo "WARNING: WiFi restore failed after 3 attempts"
  fi
}

trap restore_wifi EXIT

WGT_PATH="$PROJECT_DIR/dist/KinoPub.wgt"
SHOULD_BUILD=false

for arg in "$@"; do
  if [ "$arg" = "--build" ]; then
    SHOULD_BUILD=true
  fi
done

if [ "$SHOULD_BUILD" = true ]; then
  echo "Building .wgt..."
  bash "$SCRIPT_DIR/build-wgt.sh"
fi

if [ ! -f "$WGT_PATH" ]; then
  echo "Error: KinoPub.wgt not found. Run 'npm run build-wgt' or use --build flag."
  exit 1
fi

echo "Switching to $TV_WIFI..."
CONNECTED=false
for attempt in 1 2 3; do
  networksetup -setairportnetwork en0 "$TV_WIFI" "$WIFI_PASS" 2>/dev/null || true
  for i in $(seq 1 10); do
    IP=$(ipconfig getifaddr en0 2>/dev/null || true)
    if echo "$IP" | grep -q "^192\.168\.8\."; then
      echo "Connected: $IP"
      CONNECTED=true
      break 2
    fi
    sleep 1
  done
  echo "Retry $attempt..."
done
if [ "$CONNECTED" = false ]; then
  echo "ERROR: Failed to connect to $TV_WIFI after 3 attempts"
  exit 1
fi

echo "Connecting sdb to $TV_IP..."
sdb kill-server 2>/dev/null || true
sleep 1
sdb start-server 2>/dev/null || true
sdb connect "$TV_IP":26101

echo "Installing KinoPub.wgt..."
tizen install -n "$WGT_PATH" -s "$TV_IP":26101

echo "Launching app..."
sdb -s "$TV_IP:26101" shell 0 debug "$APP_ID" 2>/dev/null || true

echo "Done!"
