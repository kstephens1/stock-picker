# Mobile-First Development Workflow

This guide walks you through the complete mobile-first development lifecycle using GitHub Copilot Workspace, GitHub Mobile App, and GitHub Actions.

## 🚀 Quick Start

### 1. Create an Issue on Mobile
Open the **GitHub Mobile App** → Your repository → **Issues** tab → **Create Issue**

```
Title: [Feature] Add stock price alerts

Description:
@copilot
- Add email notification when stock price reaches threshold
- Store alert preferences in database
- Send notifications via background job
```

**Key:** Include `@copilot` in the description to trigger Copilot assignment.

### 2. Open in Copilot Workspace
Once the issue is created and @copilot is assigned:
- Tap the **ellipsis (...)** on the issue
- Select **Open in Copilot Workspace**
- The Copilot agent will:
  - 📊 Analyze your repository structure
  - 🧠 Propose a technical implementation plan
  - 📋 Generate step-by-step natural language instructions

If the mobile app does not show **Open in Copilot Workspace**:
- Assign `copilot-swe-agent` (or `copilot`) in issue assignees
- Open the same issue URL in your mobile browser
- Enable desktop site mode and start Workspace from the web issue page

### 3. Review & Edit Plan
**Before any code is written:**

1. Read the proposed technical plan on your phone
2. Edit the natural language steps if needed:
   - Add database schema details
   - Clarify which components need changes
   - Specify testing requirements
3. When satisfied, approve the plan

### 4. Generate Code Autonomously
Once you approve:
- Copilot Workspace generates the implementation
- Automatically runs unit tests
- Executes E2E tests in a transient environment
- Opens a Pull Request with all changes

### 5. Review on Mobile
In the **GitHub Mobile App** → **Pull Requests**:

- ✅ Browse the **Files Changed** tab with native diffs
- 💬 Leave inline comments on specific lines
- 🤔 Use **Copilot Chat** on mobile to ask:
  - "Explain this function"
  - "Why was this changed?"
  - "What tests cover this?"
- 📊 Check the build status and test results

### 6. Automated Merge & Deployment
Once you approve the PR:
- Merge to `main`
- GitHub Actions **automatically**:
  - ✅ Re-runs all tests
  - 🏗️ Builds the frontend
  - 🚀 Deploys to Firebase Hosting
  - 🖥️ Updates the backend on Compute Engine
  - 🧪 Runs smoke tests against production

### 7. View Real-Time Build Logs
**During deployment:**
- Open the **GitHub Mobile App**
- Go to **Actions** tab
- Tap the running workflow
- 📜 Watch live logs as they stream
- See the build progress in real-time

### 8. Handle Build Failures (Mobile)
If a build fails:

1. Tap the **failed workflow** in the Actions tab
2. Scroll through **logs** to find the error
3. Tap **Copilot Chat** in the mobile app
4. Ask: **"Explain this build failure"**
5. Copilot will:
   - Analyze the logs
   - Identify the root cause
   - Suggest a fix
6. Create a new issue with the fix and assign to @copilot

---

## 📋 Environment Configuration

### GitHub Environment Secrets (Production)

Set these once in GitHub Settings → Secrets and Variables → Environment secrets (production):

```
GCP_WORKLOAD_IDENTITY_PROVIDER    # GCP identity federation URL
GCP_SERVICE_ACCOUNT               # GCP service account email
GCP_PROJECT_ID                    # Your Google Cloud project ID
GCP_ZONE                          # Compute Engine zone (e.g., us-central1-a)
GCE_INSTANCE                      # Compute Engine VM instance name
VM_SERVICE_NAME                   # systemd service name (default: stock-picker)

FIREBASE_PROJECT_ID               # Firebase project ID
FIREBASE_TOKEN                    # Firebase CLI token (firebase login:ci)

BACKEND_URL                       # Production backend URL
FRONTEND_URL                      # Production frontend URL (Firebase domain)
```

#### How to Generate Firebase Token (for CI/CD):
```bash
firebase login:ci
# Copy the token and paste into FIREBASE_TOKEN secret
```

#### How to Set Up GCP Workload Identity:
```bash
# Follow: https://github.com/google-github-actions/auth#workload-identity-federation
# This allows GitHub Actions to authenticate without storing long-lived keys
```

---

## 💰 Cost Considerations

| Service | Cost | Notes |
|---------|------|-------|
| **GitHub Actions** | Free/Paid | Free for public repos; 2000 min/month for private repos. Each minute of usage costs $0.005 over the limit. |
| **Copilot Workspace** | $20/month per seat | Includes unlimited plan generation and code generation. |
| **Environment Secrets** | Free | Unlimited secrets stored securely. |
| **GitHub Mobile App** | Free | Native PR review with Copilot Chat integration. |
| **Google Cloud (GCP)** | Varies | Compute Engine, Firebase hosting—costs depend on your usage. |

**Total Estimated Cost:** $20/month (Copilot Workspace) + your existing GCP/Firebase costs.

> **No additional costs** for automated deployment, environment secrets, or mobile app features beyond your base subscriptions.

---

## 🔄 Complete Mobile-First Workflow Example

### Scenario: Fix a Bug
```
1. In GitHub Mobile App → Create Issue
   Title: [Bug] Login fails with special characters
   @copilot
   Details: When username contains @, login fails

2. Tap "Open in Workspace"
   → Copilot proposes: sanitize input, add test case

3. Edit plan on mobile:
   - Uncomment "Add unit test first"
   - Specify exact validation regex needed

4. Approve → Copilot generates PR with fix + tests

5. Review PR on mobile:
   - Check the sanitization logic
   - Ask Copilot: "Why this regex?"
   - Leave approval comment

6. Merge → Actions automates deployment
   → Tests run → Firebase + GCE update
   → Smoke tests verify against prod

7. Check logs on mobile:
   → See real-time deployment progress
   → Verify smoke tests passed
```

---

## 📱 GitHub Mobile App Features

### Key Features for This Workflow:
- ✅ Create issues with rich text
- ✅ Tap "Open in Workspace" for Copilot
- ✅ Native PR reviewer with diff viewing
- ✅ Copilot Chat integration in PRs
- ✅ Real-time action logs
- ✅ Inline comments on specific lines
- ✅ Merge PRs directly from mobile
- ✅ Create branches and push commits
- ✅ View build artifacts and reports

### Link:
- iOS: [GitHub on App Store](https://apps.apple.com/app/github/id1477376905)
- Android: [GitHub on Google Play](https://play.google.com/store/apps/details?id=com.github.android)

---

## 🛠️ Troubleshooting

### "Open in Workspace" not appearing?
- Ensure issue is assigned to `copilot-swe-agent` or `copilot`
- Issue must mention specific work (@copilot in description)
- Workspace is only available for issues, not PRs
- Try mobile browser in desktop site mode if the app UI does not expose the button

### Build failures in Actions?
1. Tap the **failed workflow** in GitHub Mobile
2. Read the log section that failed
3. Use Copilot Chat: **"What caused this failure?"**
4. Create new issue with fix

### Deployment not triggering?
- Check branch is `main`
- Verify all GitHub Secrets are set
- Check if tests are failing (blocks deployment)
- Manual trigger: GitHub Mobile → Actions → Deploy workflow → Run

### Can't view logs on mobile?
- Ensure GitHub app is updated to latest version
- Try mobile web: github.com → Actions tab
- Desktop fallback: View full logs on laptop via SSH

---

## 📞 Need Help?

### Common Questions:

**Q: Will Copilot Workspace actually code the whole feature?**  
A: Yes! Once approved, it writes code, runs tests, and opens PRs. You review on mobile.

**Q: Can I edit the plan before code is generated?**  
A: Absolutely! That's the key feature. Copilot shows the plan first, you edit it, then it codes.

**Q: How long do E2E tests take?**  
A: Depends on test count. Our Playwright tests typically take 2-3 minutes. Check Actions logs.

**Q: What if I want to reject the Copilot plan?**  
A: Just modify it or close the Workspace without approving. No PR is created until you approve.

**Q: Can I use this workflow for hotfixes?**  
A: Yes! Create an issue, assign to @copilot, follow the workflow. Just ensure you review carefully before merging to production.

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] Issue created and assigned to @copilot
- [ ] Plan reviewed and edited on mobile
- [ ] PR created and code reviewed on GitHub Mobile
- [ ] All GitHub Actions tests passing (green checkmarks)
- [ ] E2E tests passed in transient environment
- [ ] Smoke tests will run against production before going live
- [ ] PR merged to main
- [ ] Watch deployment logs on mobile
- [ ] Verify frontend and backend both updated

---

**Happy mobile-first development! 🚀**

*Last Updated: March 17, 2026*
