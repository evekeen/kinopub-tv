#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_ID="evekeen001.KinoPub"

TV_IPS=("192.168.8.195" "192.168.8.146")
TV_IP=""
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

trap restore_wifi EXIT INT TERM

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
  echo "WiFi retry $attempt..."
done
if [ "$CONNECTED" = false ]; then
  echo "ERROR: Failed to connect to $TV_WIFI after 3 attempts"
  exit 1
fi

SDB_CONNECTED=false
for candidate in "${TV_IPS[@]}"; do
  echo "Trying TV at $candidate..."
  sdb disconnect "$candidate":26101 >/dev/null 2>&1 || true
  sleep 1
  for attempt in 1 2 3; do
    OUTPUT=$(sdb connect "$candidate":26101 2>&1 || true)
    echo "$OUTPUT"
    if echo "$OUTPUT" | grep -q "connected to"; then
      SDB_CONNECTED=true
      TV_IP="$candidate"
      break 2
    fi
    echo "sdb retry $attempt for $candidate..."
    sleep 2
  done
done
if [ "$SDB_CONNECTED" = false ]; then
  echo "ERROR: Failed to connect sdb to any TV IP"
  echo "Scanning 192.168.8.0/24 for TV via arp..."
  arp -a | grep -i '192\.168\.8\.' || true
  echo "Pinging known IPs..."
  for ip in 192.168.8.195 192.168.8.146; do
    ping -c 1 -W 1 "$ip" >/dev/null 2>&1 && echo "$ip is up" || echo "$ip is down"
  done
  exit 1
fi
echo "Connected via $TV_IP"

echo "Pushing KinoPub.wgt to TV..."
PUSHED=false
for attempt in 1 2 3; do
  if sdb -s "$TV_IP":26101 push "$WGT_PATH" /home/owner/share/tmp/sdk_tools/tmp/KinoPub.wgt 2>&1; then
    PUSHED=true
    break
  fi
  echo "Push retry $attempt — reconnecting sdb..."
  sdb disconnect "$TV_IP":26101 2>/dev/null || true
  sleep 3
  sdb connect "$TV_IP":26101 2>&1 || true
  sleep 2
done
if [ "$PUSHED" = false ]; then
  echo "ERROR: Failed to push file after 3 attempts"
  exit 1
fi

echo "Installing KinoPub.wgt on TV..."
sdb -s "$TV_IP":26101 shell 0 vd_appinstall evekeen001 /home/owner/share/tmp/sdk_tools/tmp/KinoPub.wgt 2>&1 || \
  tizen install -n "$WGT_PATH" -s "$TV_IP":26101 2>&1 || true

echo "Launching app..."
sdb -s "$TV_IP:26101" shell 0 debug "$APP_ID" 2>/dev/null || true

echo "Done!"
