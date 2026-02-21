#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required_vars=(
  "GCP_PROJECT_ID"
  "GCP_ZONE"
  "GCE_INSTANCE"
  "FIREBASE_PROJECT_ID"
  "BACKEND_URL"
  "FRONTEND_URL"
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required environment variable: ${var_name}"
    exit 1
  fi
done

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI is required"
  exit 1
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI is required"
  exit 1
fi

SSH_TARGET="${GCE_INSTANCE}"
VM_APP_DIR="${VM_APP_DIR:-/opt/stockpicker}"
VM_SERVICE_NAME="${VM_SERVICE_NAME:-stock-picker}"
VM_RUNTIME_USER="${VM_RUNTIME_USER:-stockpicker}"
VM_RUNTIME_GROUP="${VM_RUNTIME_GROUP:-stockpicker}"
VM_DB_PATH="${VM_DB_PATH:-/var/lib/stockpicker/stocks.db}"
BACKEND_URL="${BACKEND_URL%/}"

echo "Running unit tests"
cd "${ROOT_DIR}"
TEST_DB_PATH="$(mktemp "${TMPDIR:-/tmp}/stockpicker-deploy-testdb.XXXXXX.sqlite" 2>/dev/null || mktemp -t stockpicker-deploy-testdb.sqlite)"
cleanup_test_db() {
  rm -f "${TEST_DB_PATH}"
}
trap cleanup_test_db EXIT
STOCKPICKER_DB_PATH="${TEST_DB_PATH}" npm run test:unit

echo "Building frontend"
cd "${ROOT_DIR}/client"
REACT_APP_API_BASE_URL="${BACKEND_URL}" npm run build

echo "Preparing VM directories"
gcloud compute ssh "${SSH_TARGET}" \
  --zone "${GCP_ZONE}" \
  --project "${GCP_PROJECT_ID}" \
  --command "sudo mkdir -p '${VM_APP_DIR}' /etc/stockpicker /var/lib/stockpicker"

echo "Syncing backend files to VM"
tar -C "${ROOT_DIR}" -czf - server | gcloud compute ssh "${SSH_TARGET}" \
  --zone "${GCP_ZONE}" \
  --project "${GCP_PROJECT_ID}" \
  --command "sudo rm -rf '${VM_APP_DIR}/server' && sudo tar -xzf - -C '${VM_APP_DIR}'"

echo "Ensuring runtime user"
gcloud compute ssh "${SSH_TARGET}" \
  --zone "${GCP_ZONE}" \
  --project "${GCP_PROJECT_ID}" \
  --command "id -u '${VM_RUNTIME_USER}' >/dev/null 2>&1 || sudo useradd --system --create-home '${VM_RUNTIME_USER}'"

echo "Ensuring Node.js and npm are installed"
gcloud compute ssh "${SSH_TARGET}" \
  --zone "${GCP_ZONE}" \
  --project "${GCP_PROJECT_ID}" \
  --command "command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 || (sudo apt-get update -y && sudo apt-get install -y nodejs npm)"

echo "Setting ownership for app and data directories"
gcloud compute ssh "${SSH_TARGET}" \
  --zone "${GCP_ZONE}" \
  --project "${GCP_PROJECT_ID}" \
  --command "sudo chown -R '${VM_RUNTIME_USER}:${VM_RUNTIME_GROUP}' '${VM_APP_DIR}' /var/lib/stockpicker"

echo "Installing backend dependencies"
gcloud compute ssh "${SSH_TARGET}" \
  --zone "${GCP_ZONE}" \
  --project "${GCP_PROJECT_ID}" \
  --command "sudo -u '${VM_RUNTIME_USER}' bash -lc 'cd \"${VM_APP_DIR}/server\" && npm ci --omit=dev'"

echo "Writing backend environment file"
gcloud compute ssh "${SSH_TARGET}" \
  --zone "${GCP_ZONE}" \
  --project "${GCP_PROJECT_ID}" \
  --command "sudo bash -lc 'cat > /etc/stockpicker/backend.env <<EOF
PORT=4000
STOCKPICKER_DB_PATH=${VM_DB_PATH}
EOF'"

echo "Installing systemd service"
SERVICE_FILE_CONTENT="$(cat "${ROOT_DIR}/server/deploy/stock-picker.service")"
SERVICE_FILE_CONTENT="${SERVICE_FILE_CONTENT//\/opt\/stockpicker/${VM_APP_DIR}}"
SERVICE_FILE_CONTENT="${SERVICE_FILE_CONTENT//User=stockpicker/User=${VM_RUNTIME_USER}}"
SERVICE_FILE_CONTENT="${SERVICE_FILE_CONTENT//Group=stockpicker/Group=${VM_RUNTIME_GROUP}}"

gcloud compute ssh "${SSH_TARGET}" \
  --zone "${GCP_ZONE}" \
  --project "${GCP_PROJECT_ID}" \
  --command "sudo bash -lc 'cat > /etc/systemd/system/${VM_SERVICE_NAME}.service <<\"EOF\"
${SERVICE_FILE_CONTENT}
EOF'"

echo "Setting VM permissions and restarting service"
gcloud compute ssh "${SSH_TARGET}" \
  --zone "${GCP_ZONE}" \
  --project "${GCP_PROJECT_ID}" \
  --command "sudo bash -lc 'chmod 640 /etc/stockpicker/backend.env && if [[ -f "${VM_DB_PATH}" ]]; then cp "${VM_DB_PATH}" "${VM_DB_PATH}.bak.$(date +%Y%m%d-%H%M%S)" && ls -1t "${VM_DB_PATH}.bak."* 2>/dev/null | tail -n +8 | xargs -r rm -f; fi && systemctl daemon-reload && systemctl enable "${VM_SERVICE_NAME}" && systemctl restart "${VM_SERVICE_NAME}"'"

echo "Verifying backend service on VM"
gcloud compute ssh "${SSH_TARGET}" \
  --zone "${GCP_ZONE}" \
  --project "${GCP_PROJECT_ID}" \
  --command "sudo systemctl --no-pager --full status '${VM_SERVICE_NAME}'"

echo "Deploying frontend to Firebase Hosting"
cd "${ROOT_DIR}"
firebase deploy --only hosting --project "${FIREBASE_PROJECT_ID}"

echo "Running post-deploy smoke checks"
"${ROOT_DIR}/scripts/smoke-prod.sh"

echo "Production deployment completed"