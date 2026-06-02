# HelpQ — Deployment Guide

## Architecture

```
Azure Static Web Apps (frontend)
    │  VITE_API_URL=https://helpq.azurewebsites.net
    │  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
    │
    ▼
Azure Web App (Express backend)
    │  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    │  CORS_ORIGIN=https://green-plant-0e134ca0f.7.azurestaticapps.net
    │
    ▼
Supabase (PostgreSQL + Auth)
```

**Live URLs:**
- Frontend: https://green-plant-0e134ca0f.7.azurestaticapps.net
- Backend: https://helpq.azurewebsites.net

---

## CI/CD

Deployments are automated via GitHub Actions:

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `ci-testing.yml` | Push/PR to `main` | Lint, build, test |
| `azure-webapp-backend.yml` | CI passes on `main` | Deploy Express to Azure Web App |
| `azure-static-web-apps-green-plant-0e134ca0f.yml` | Push to `main` | Build and deploy React to Azure Static Web Apps |

---

## Step 1 — Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com).

2. Run migrations from your local Supabase CLI:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   This applies all files in `supabase/migrations/`.

3. (Optional) Seed demo data after creating demo accounts:

   ```bash
   supabase db seed
   ```

4. **Disable email confirmation** for demo ease: Supabase Dashboard →
   Authentication → Providers → Email → **Disable "Confirm email"**

5. In **Supabase Dashboard → Authentication → URL Configuration**, set:
   - **Site URL:** `https://green-plant-0e134ca0f.7.azurestaticapps.net`
   - **Redirect URLs:** `https://green-plant-0e134ca0f.7.azurestaticapps.net/**`

6. Note your keys from **Settings → API**:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

---

## Step 2 — Deploy Backend (Azure Web App)

The backend is automatically deployed via GitHub Actions when CI passes on `main`.

Environment variables are set in the Azure portal under **HelpQ Web App → Configuration → Application Settings**:

| Key                         | Value                                                                          |
| --------------------------- | ------------------------------------------------------------------------------ |
| `SUPABASE_URL`              | Your Supabase project URL                                                      |
| `SUPABASE_ANON_KEY`         | Your Supabase anon key                                                         |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key                                                 |
| `CORS_ORIGIN`               | `https://green-plant-0e134ca0f.7.azurestaticapps.net`                         |
| `SCHEDULE_TIMEZONE`         | `America/Los_Angeles`                                                          |

Verify the backend is live: `https://helpq.azurewebsites.net/health`
Should return `{ "status": "ok" }`.

---

## Step 3 — Deploy Frontend (Azure Static Web Apps)

The frontend is automatically built and deployed via GitHub Actions on every push to `main`.

Environment variables are set in the Azure portal under **HelpQ Static Web App → Configuration → Environment variables** (Production):

| Key                      | Value                                                    |
| ------------------------ | -------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL                                |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key                                   |
| `VITE_API_URL`           | `https://helpq.azurewebsites.net`                        |

---

## Step 4 — Create Demo Accounts

Via the HelpQ sign-up page or Supabase Dashboard → Authentication → Users:

| Role               | Suggested Email          |
| ------------------ | ------------------------ |
| Professor          | professor@yourschool.edu |
| Student (for demo) | student@yourschool.edu   |

---

## Step 5 — Seed Demo Data

After accounts are created, run the seed script:

```bash
# From repo root — requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
# packages/express-backend/.env
npm run demo:seed
```

This creates session `DEMO01` with 12 students in various queue states.

---

## Local Development

```bash
# Install all workspaces
npm install

# Start backend (port 3001)
npm run dev:backend

# Start frontend (port 5173, proxies /api → 3001)
npm run dev:frontend
```

Frontend env: copy `frontend/.env.example` → `frontend/.env.local` and fill in
Supabase credentials.  
Backend env: copy `packages/express-backend/.env.example` →
`packages/express-backend/.env` and fill in values.

---

## Health Check

The backend exposes `GET /health`:

```json
{
  "status": "ok",
  "timestamp": "2026-05-31T12:00:00.000Z",
  "message": "Server is running",
  "features": { "scheduleAutoSync": true }
}
```

---

## Troubleshooting

| Symptom                 | Likely cause             | Fix                                                                   |
| ----------------------- | ------------------------ | --------------------------------------------------------------------- |
| 401 on all API calls    | Wrong Supabase keys      | Check `SUPABASE_URL` / `SUPABASE_ANON_KEY` in Azure backend settings  |
| CORS error in browser   | `CORS_ORIGIN` mismatch   | Set `CORS_ORIGIN` to the exact Static Web App URL in Azure            |
| Supabase 403 in db.js   | Service role key missing | Set `SUPABASE_SERVICE_ROLE_KEY` in Azure backend settings             |
| Auth emails go nowhere  | Supabase URL config      | Update Supabase Auth → URL configuration with deployed frontend URL   |
| Blank page after deploy | Build misconfigured      | Check `app_location: ./frontend` and `output_location: dist` in YAML |
