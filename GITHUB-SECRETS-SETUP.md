# Environment Variables & GitHub Secrets Setup

This document explains how to configure your environment for the mobile-first development workflow.

## 🔐 GitHub Environment Secrets (Production)

These secrets must be set in GitHub → Settings → Secrets and Variables → Environment Secrets (production environment).

### Google Cloud Platform (GCP) Secrets

#### 1. GCP_WORKLOAD_IDENTITY_PROVIDER
- **Purpose**: Enables GitHub Actions to authenticate to GCP without storing long-lived keys
- **How to set up**:
  ```bash
  # Follow this guide to set up Workload Identity Federation:
  # https://github.com/google-github-actions/auth#workload-identity-federation
  
  # After setup, the value looks like:
  # projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider
  ```

#### 2. GCP_SERVICE_ACCOUNT
- **Purpose**: Service account email that GitHub will impersonate
- **Value**: `your-service-account@your-project.iam.gserviceaccount.com`
- **Setup**:
  ```bash
  gcloud iam service-accounts create github-actions --display-name="GitHub Actions"
  gcloud iam service-accounts list
  ```

#### 3. GCP_PROJECT_ID
- **Purpose**: Your Google Cloud project ID
- **Value**: The project ID (not name)
- **Find**: `gcloud config get-value project`

#### 4. GCP_ZONE
- **Purpose**: Compute Engine zone where your VM runs
- **Value**: e.g., `us-central1-a`, `us-west1-b`
- **Find**: `gcloud compute zones list`

#### 5. GCE_INSTANCE
- **Purpose**: Name of your Compute Engine VM instance
- **Value**: e.g., `stockpicker-prod-vm`
- **Find**: `gcloud compute instances list`

#### 6. VM_SERVICE_NAME
- **Purpose**: Name of the systemd service managing the Node.js app
- **Value**: Default is `stock-picker` (configured in `deploy/stock-picker.service`)

### Firebase Secrets

#### 7. FIREBASE_PROJECT_ID
- **Purpose**: Your Firebase project ID  
- **Value**: e.g., `stockpicker-prod-ks-2026`
- **Find**: Firebase Console → Project Settings

#### 8. FIREBASE_TOKEN
- **Purpose**: Authentication token for Firebase CLI (for CI/CD)
- **Generate**:
  ```bash
  firebase login:ci
  # This outputs a token—copy it into the secret
  ```
- **⚠️ Important**: Keep this token secure. Treat like a password.

### Deployment URL Secrets

#### 9. BACKEND_URL
- **Purpose**: Production backend API URL
- **Value**: e.g., `https://api.stockpicker.yourdomain.com`
- **Used by**: React build process (as `REACT_APP_API_BASE_URL`)

#### 10. FRONTEND_URL
- **Purpose**: Production frontend URL
- **Value**: e.g., `https://stockpicker-prod-ks-2026.web.app`
- **Used by**: E2E smoke tests to verify deployment

---

## 🔧 Local Development (.env files)

### Root Directory `.env` (for deployment script)

Create `/Users/keithstephens/src/StockPicker/.env`:
```bash
GCP_PROJECT_ID=your-gcp-project-id
GCP_ZONE=us-central1-a
GCE_INSTANCE=stockpicker-prod-vm
FIREBASE_PROJECT_ID=stockpicker-prod-ks-2026
BACKEND_URL=https://api.stockpicker.yourdomain.com
FRONTEND_URL=https://stockpicker-prod-ks-2026.web.app
VM_APP_DIR=/opt/stockpicker
VM_SERVICE_NAME=stock-picker
VM_DB_PATH=/var/lib/stockpicker/stocks.db
```

### Server `.env` (Backend Configuration)

Create `/Users/keithstephens/src/StockPicker/server/.env`:
```bash
NODE_ENV=development
PORT=4000
DATABASE_PATH=./stocks.db
LOG_LEVEL=debug
```

### Client `.env.development` (Frontend Development Configuration)

Create `/Users/keithstephens/src/StockPicker/client/.env.development`:
```bash
REACT_APP_API_BASE_URL=http://localhost:4000
```

### Client `.env.test` (Frontend Test Configuration)

Create `/Users/keithstephens/src/StockPicker/client/.env.test`:
```bash
REACT_APP_API_BASE_URL=
```

This keeps Jest and React Testing Library using relative `/api/...` URLs so the existing mocked tests still pass.

---

## 🚀 Setting Up GitHub Secrets Step-by-Step

### 1. Navigate to Secret Settings
```
GitHub.com → Your Repository → Settings → Secrets and Variables → Actions
```

### 2. Create Environment (if not exists)
- Click **Environments** on the left sidebar
- Click **New environment**
- Name it: `production`

### 3. Add Secrets to Production Environment
For each secret (GCP_PROJECT_ID, FIREBASE_TOKEN, etc.):
- Click **New environment secret**
- **Name**: Exact name (e.g., `GCP_PROJECT_ID`)
- **Value**: Your actual secret/credential
- Click **Add secret**

### 4. Verify All Required Secrets
Checklist:
- [ ] GCP_WORKLOAD_IDENTITY_PROVIDER
- [ ] GCP_SERVICE_ACCOUNT
- [ ] GCP_PROJECT_ID
- [ ] GCP_ZONE
- [ ] GCE_INSTANCE
- [ ] VM_SERVICE_NAME
- [ ] FIREBASE_PROJECT_ID
- [ ] FIREBASE_TOKEN
- [ ] BACKEND_URL
- [ ] FRONTEND_URL

---

## 🔐 Security Best Practices

1. **Never commit `.env` files** — They're in `.gitignore`
2. **Rotate Firebase tokens** — Periodically regenerate with `firebase login:ci`
3. **Use Workload Identity** — Avoid storing long-lived GCP credentials
4. **Limit secret scope** — Secrets only available in `production` environment
5. **Audit secret access** — GitHub logs who accesses secrets in Actions
6. **Disable PR secrets** — Secrets won't expose in PR from forks (GitHub default)

---

## 🧪 Testing Secrets Configuration

### Verify GitHub Secrets Work
1. Create a simple test workflow:
   ```yaml
   name: Test Secrets
   on: push
   jobs:
     verify:
       runs-on: ubuntu-latest
       environment: production
       steps:
         - run: echo "Backend URL is configured"
         - run: echo "Secrets exist in this environment"
   ```

2. Push to a branch and check Actions tab

### Verify Local `.env` Works
```bash
cd server
cat .env    # Should show your local configuration
npm start   # Should start on configured PORT
```

---

## 🆘 Troubleshooting

### "Secrets not found" in GitHub Actions
- **Solution**: Check environment is set to `production` in workflow YAML
- **File**: `.github/workflows/deploy-production.yml`
- Look for: `environment: production`

### Firebase Deployment Fails
- **Solution**: Run `firebase login:ci` again and regenerate FIREBASE_TOKEN
- **Test**: `firebase projects:list --token YOUR_TOKEN`

### GCP Authentication Fails
- **Solution**: Ensure service account has required IAM roles
  ```bash
  gcloud projects get-iam-policy YOUR_PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:*@iam.gserviceaccount.com"
  ```

### Smoke Tests Fail Against Production
- **Solution**: Check FRONTEND_URL and BACKEND_URL are correct and reachable
- **Debug**: Run locally: `npm run test:e2e:prod --headed`

---

## 📞 Need Help?

- **Firebase Issues**: https://firebase.google.com/support
- **GCP Issues**: https://cloud.google.com/support
- **GitHub Actions**: https://github.com/github/docs/tree/main/content/actions
- **GitHub Copilot Workspace**: Visit https://github.com/features/copilot/workspace

---

**Last Updated**: March 17, 2026  
*Part of the mobile-first development workflow setup*
