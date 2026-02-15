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

echo "Checking backend health"
curl -fsS "${BACKEND_URL}/api/hello" >/dev/null

echo "Checking backend read endpoint"
curl -fsS "${BACKEND_URL}/api/strategies" >/dev/null

echo "Checking frontend routes"
curl -fsS "${FRONTEND_URL}/" >/dev/null
curl -fsS "${FRONTEND_URL}/strategies" >/dev/null

echo "Validating backend write/delete cycle"
strategy_payload='{"strategy":"deploy-smoke-strategy"}'
created_strategy=$(curl -fsS -X POST "${BACKEND_URL}/api/strategies" -H "Content-Type: application/json" -d "${strategy_payload}")

strategy_id=$(printf '%s' "${created_strategy}" | node -e "const fs=require('fs');const body=JSON.parse(fs.readFileSync(0,'utf8'));if(!body.id){process.exit(1)};process.stdout.write(String(body.id));")

curl -fsS -X DELETE "${BACKEND_URL}/api/strategies/${strategy_id}" >/dev/null

echo "Smoke checks passed"