# 🚀 Mobile-First Development Quick Reference

## ⚡ 5-Step Mobile Development Workflow

### Step 1: Create Issue (Mobile App)
```
📱 GitHub App → Issues → New Issue
↓
Title: [Feature] Stock price alerts
Body mentions: @copilot
↓
Issue created & assigned to @copilot
```

### Step 2: Open in Workspace
```
📱 Issue detail → Ellipsis (...) → "Open in Workspace"
↓
🧠 Copilot analyzes repo:
  ✅ Reads codebase structure
  ✅ Understands tech stack  
  ✅ Proposes implementation plan
  ✅ Generates step-by-step instructions
```

If you do not see the button in the app:
- Assign `copilot-swe-agent` (or `copilot`) to the issue
- Open the issue in mobile browser and switch to desktop site mode

### Step 3: Edit Plan (Mobile)
```
📱 Review Copilot's proposed plan
↓
Edit natural language steps:
  - "Add tests first"
  - "Use existing auth pattern"
  - "Schedule notifications hourly"
↓
Approve & Submit
```

### Step 4: Autonomous Implementation
```
🤖 Copilot:
  ✅ Writes code
  ✅ Adds unit tests
  ✅ Runs E2E tests  
  ✅ Opens PR

💬 Real-time: Watch in GitHub Actions
```

### Step 5: Mobile Review & Merge
```
📱 GitHub App → Pull Requests → Your PR
↓
  ✅ Browse diffs (native)
  ✅ Leave comments (inline)
  ✅ Use Copilot Chat ("Explain this")
  ✅ Approve & Merge
↓
🚀 GitHub Actions:
  ✅ Re-runs all tests
  ✅ Builds frontend
  ✅ Deploys to Firebase
  ✅ Updates backend on GCE
  ✅ Smoke tests verify
```

---

## 🔗 Configuration Checklist

- [ ] **Workflow files pushed to GitHub**
  - GitHub Actions only lists workflows after the `.github/workflows/` files are committed and pushed

- [ ] **GitHub Secrets Set** → Follow `GITHUB-SECRETS-SETUP.md`
  - [ ] GCP_WORKLOAD_IDENTITY_PROVIDER
  - [ ] GCP_SERVICE_ACCOUNT
  - [ ] GCP_PROJECT_ID
  - [ ] GCP_ZONE
  - [ ] GCE_INSTANCE
  - [ ] FIREBASE_PROJECT_ID
  - [ ] FIREBASE_TOKEN
  - [ ] BACKEND_URL
  - [ ] FRONTEND_URL

- [ ] **Workflows Enabled**
  - `.github/workflows/test-and-build.yml` ✅
  - `.github/workflows/deploy-production.yml` ✅
  - `.github/workflows/auto-assign-copilot.yml` ✅

- [ ] **Local Setup**
  - [ ] `.env` file created (root)
  - [ ] `server/.env` created
  - [ ] `client/.env.development` created
  - [ ] `client/.env.test` created
  - [ ] `npm run install:all` completed
  - [ ] `npm run test:unit` passes

---

## 📱 Mobile App Tips

### Create Issue (Copy-Paste Template)
```
@copilot

## What
[Describe what you want built]

## Why  
[Why is this important?]

## Acceptance Criteria
- [ ] Feature works
- [ ] Tests pass
- [ ] No breaking changes
```

### Review PR on Mobile
- **Swipe left** on file to see diff
- **Tap line number** to comment
- **Copilot Chat** icon appears in PR thread
- Ask: "What does this function do?"
- Ask: "Why was this file changed?"
- Ask: "Explain the test strategy"

### Watch Deployment
1. Tap **Actions** tab
2. Find **Deploy to Production** workflow  
3. Tap it to watch real-time logs
4. Each step shows live output

---

## 🆘 If Something Goes Wrong

### Build Failed?
1. Tap the **failed workflow** in Actions
2. Scroll to find the error
3. Open **Copilot Chat** in mobile app
4. Ask: **"What caused this build failure?"**
5. Copilot explains the error with fix suggestions

### Deployment Stuck?
1. Check Actions logs for specific error
2. Common causes:
   - Missing GitHub secret
   - GCE VM network/firewall issue
   - Firebase project mismatch
3. Run the workflow manually from mobile: **Run workflow** button

### Tests Timing Out?
1. Increase timeout in `playwright.config.js`
2. Check if GCE backend is running: `gcloud compute ssh [INSTANCE] --command="systemctl status stock-picker"`
3. Mobile app can't check server—must use desktop CLI or mobile web

---

## 💡 Pro Tips

✅ **Always test locally first** before assigning to @copilot
```bash
npm run install:all
npm run dev              # In one terminal
npm run test:unit       # In another
npm run test:e2e        # In another  
```

✅ **Draft PRs before review** if you want feedback
- Create a draft PR from mobile
- Leave yourself comments
- Then mark ready for review

✅ **Use GitHub Discussions** for questions
- Not part of this workflow
- But great for async discussion

✅ **Check artifact downloads** in Actions
- E2E report: `playwright-report/`
- Build artifacts: `client/build/`
- Available 30 days during Actions run detail

---

## 📚 Reference Files

| File | Purpose |
|------|---------|
| `.copilot-instructions.md` | Copilot Workspace guidance |
| `.instructions.md` | Development standards |
| `MOBILE-FIRST-DEV.md` | Complete workflow guide |
| `GITHUB-SECRETS-SETUP.md` | Secret configuration |
| `.github/workflows/test-and-build.yml` | CI pipeline |
| `.github/workflows/deploy-production.yml` | CD pipeline |

---

## 🚀 Quick Commands

```bash
# Local development
npm run dev                    # Start frontend + backend
npm run test:unit             # Run unit tests
npm run test:e2e              # Run E2E tests
npm run build                 # Build for production

# Deployment  
npm run deploy:prod           # Manual deploy to production
npm run smoke:prod            # Run smoke tests against production

# Check status
npm run test:e2e:report       # View E2E test report
```

---

## 📞 Questions?

- **Copilot Workspace issues?** → Read `.copilot-instructions.md`
- **Deployment issues?** → Check `GITHUB-SECRETS-SETUP.md`
- **GitHub Mobile tips?** → See `MOBILE-FIRST-DEV.md`
- **Local development?** → Check project `README.md`

---

**Ready to start?**

1. ✅ Set up GitHub Secrets (5 min)
2. ✅ Test locally: `npm run install:all && npm run test:unit`
3. ✅ Install GitHub Mobile App
4. ✅ Create first issue with `@copilot`
5. ✅ Tap "Open in Workspace"
6. 🎉 Watch Copilot code for you

*Last Updated: March 17, 2026*
