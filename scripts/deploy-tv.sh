#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WGT_NAME="kinopub-tizen.wgt"
WGT_PATH="$PROJECT_DIR/$WGT_NAME"
APP_ID="evekeen001.KinoPub"
PACKAGE_ID="evekeen001"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <TV_IP> [--build]"
  echo ""
  echo "Deploys kinopub-tizen.wgt to a Samsung TV via sdb."
  echo ""
  echo "Options:"
  echo "  --build    Run build-wgt.sh before deploying"
  echo ""
  echo "Prerequisites:"
  echo "  - Tizen Studio installed with sdb in PATH"
  echo "  - TV in Developer Mode with your PC's IP whitelisted"
  echo "  - TV and PC on the same network"
  exit 1
fi

TV_IP="$1"
SHOULD_BUILD=false

for arg in "$@"; do
  if [ "$arg" = "--build" ]; then
    SHOULD_BUILD=true
  fi
done

if ! command -v sdb &> /dev/null; then
  echo "Error: sdb not found in PATH."
  echo "Install Tizen Studio and add its tools directory to PATH."
  exit 1
fi

if [ "$SHOULD_BUILD" = true ]; then
  echo "Building .wgt..."
  bash "$SCRIPT_DIR/build-wgt.sh"
fi

if [ ! -f "$WGT_PATH" ]; then
  echo "Error: $WGT_NAME not found. Run scripts/build-wgt.sh first or use --build flag."
  exit 1
fi

echo "Connecting to TV at $TV_IP..."
sdb connect "$TV_IP"
sdb -s "$TV_IP:26101" capability > /dev/null 2>&1 || {
  echo "Error: Could not connect to TV at $TV_IP:26101"
  exit 1
}

echo "Uninstalling previous version (if any)..."
sdb -s "$TV_IP:26101" shell 0 vd_appuninstall "$PACKAGE_ID" 2>/dev/null || true

echo "Installing $WGT_NAME..."
sdb -s "$TV_IP:26101" install "$WGT_PATH"

echo "Launching app..."
sdb -s "$TV_IP:26101" shell 0 vd_appcontrol "launch $APP_ID"

echo ""
echo "Deployed successfully to $TV_IP"
echo "App ID: $APP_ID"
