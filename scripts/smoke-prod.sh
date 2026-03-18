#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  "BACKEND_URL"
  "FRONTEND_URL"
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required environment variable: ${var_name}"
    exit 1
  fi
done

BACKEND_URL="${BACKEND_URL%/}"
FRONTEND_URL="${FRONTEND_URL%/}"

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts="${3:-30}"
  local sleep_seconds="${4:-2}"

  for ((i=1; i<=attempts; i++)); do
    if curl -fsS "${url}" >/dev/null; then
      return 0
    fi
    echo "${label} not ready yet (attempt ${i}/${attempts})"
    sleep "${sleep_seconds}"
  done

  echo "Timed out waiting for ${label}: ${url}"
  return 1
}

echo "Checking backend health"
wait_for_url "${BACKEND_URL}/api/hello" "backend health endpoint"

echo "Checking backend read endpoint"
wait_for_url "${BACKEND_URL}/api/strategies" "backend strategies endpoint"

echo "Checking frontend routes"
curl -fsS "${FRONTEND_URL}/" >/dev/null
curl -fsS "${FRONTEND_URL}/strategies" >/dev/null

echo "Validating backend write/delete cycle"
strategy_payload='{"strategy":"deploy-smoke-strategy"}'
created_strategy=$(curl -fsS -X POST "${BACKEND_URL}/api/strategies" -H "Content-Type: application/json" -d "${strategy_payload}")

strategy_id=$(printf '%s' "${created_strategy}" | node -e "const fs=require('fs');const body=JSON.parse(fs.readFileSync(0,'utf8'));if(!body.id){process.exit(1)};process.stdout.write(String(body.id));")

curl -fsS -X DELETE "${BACKEND_URL}/api/strategies/${strategy_id}" >/dev/null

echo "Smoke checks passed"