#!/usr/bin/env bash
# Builds the demo website (spec live-demo D1/D8) into dist-demo/ using the public config in .env.demo (not in git).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.demo ] || { echo "Missing .env.demo (Firebase web config + API URL)"; exit 1; }
set -a; . ./.env.demo; set +a
rm -rf dist-demo
npx expo export --platform web --output-dir dist-demo --clear
echo "Built dist-demo/ for $EXPO_PUBLIC_API_URL"
