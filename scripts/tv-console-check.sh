#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <TV_IP>"
  echo ""
  echo "Connects to a Samsung TV via sdb and tails the app's console log."
  echo "Filters for errors, warnings, and key events."
  echo ""
  echo "Prerequisites:"
  echo "  - Tizen Studio installed with sdb in PATH"
  echo "  - TV in Developer Mode with your PC's IP whitelisted"
  echo "  - KinoPub app installed and running on the TV"
  exit 1
fi

TV_IP="$1"
APP_ID="evekeen001.KinoPub"

if ! command -v sdb &> /dev/null; then
  echo "Error: sdb not found in PATH."
  echo "Install Tizen Studio and add its tools directory to PATH."
  exit 1
fi

echo "Connecting to TV at $TV_IP..."
sdb connect "$TV_IP"

DEVICE="$TV_IP:26101"

echo "Connected. Tailing console output for $APP_ID..."
echo "Press Ctrl+C to stop."
echo "---"

sdb -s "$DEVICE" dlog -v long -s ConsoleMessage:V WebHelper:V *:S 2>/dev/null \
  | while IFS= read -r line; do
    case "$line" in
      *[Ee]rror*|*[Ee]xception*|*FATAL*|*[Ff]ailed*)
        echo "[ERROR] $line"
        ;;
      *[Ww]arn*)
        echo "[WARN]  $line"
        ;;
      *Hls*|*hls*|*MSE*|*SourceBuffer*)
        echo "[HLS]   $line"
        ;;
      *)
        echo "        $line"
        ;;
    esac
  done
