#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
WGT_NAME="kinopub-tizen.wgt"

echo "Building production bundle..."
cd "$PROJECT_DIR"
npm run build

echo "Copying Tizen config..."
cp "$PROJECT_DIR/tizen/config.xml" "$DIST_DIR/config.xml"

if [ -f "$PROJECT_DIR/tizen/icon.png" ]; then
  cp "$PROJECT_DIR/tizen/icon.png" "$DIST_DIR/icon.png"
fi

echo "Packaging .wgt..."
cd "$DIST_DIR"
rm -f "$PROJECT_DIR/$WGT_NAME"
zip -r "$PROJECT_DIR/$WGT_NAME" . -x "*.map"

echo "Created $WGT_NAME ($(du -h "$PROJECT_DIR/$WGT_NAME" | cut -f1))"
