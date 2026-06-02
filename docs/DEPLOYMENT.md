# HelpQ — Deployment Guide

## Architecture

```
Netlify (frontend)
    │  VITE_API_URL=https://helpq-backend.onrender.com
    │
    ▼
Render (Express backend)
    │  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    │  CORS_ORIGIN=https://your-netlify-domain.netlify.app
    │
    ▼
Supabase (PostgreSQL + Auth)
```

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
   - **Site URL:** `https://your-netlify-domain.netlify.app`
   - **Redirect URLs:** `https://your-netlify-domain.netlify.app/**`

6. Note your keys from **Settings → API**:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

---

## Step 2 — Deploy Backend (Render)

1. Push your code to GitHub.

2. In Render, create a **Web Service**:
   - **Root Directory:** `packages/express-backend`
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - Or use the `render.yaml` at the repo root for one-click deploy.

3. Set Environment Variables in Render dashboard:

   | Key                         | Value                                               |
   | --------------------------- | --------------------------------------------------- |
   | `NODE_ENV`                  | `production`                                        |
   | `PORT`                      | `3001`                                              |
   | `SUPABASE_URL`              | Your Supabase project URL                           |
   | `SUPABASE_ANON_KEY`         | Your Supabase anon key                              |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key                      |
   | `CORS_ORIGIN`               | Your Netlify URL (e.g. `https://helpq.netlify.app`) |
   | `SCHEDULE_TIMEZONE`         | `America/Los_Angeles`                               |

4. Verify the backend is live: `https://helpq-backend.onrender.com/health`
   Should return `{ "status": "ok" }`.

---

## Step 3 — Deploy Frontend (Netlify)

1. In Netlify, connect your GitHub repo.

2. Configure the build:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
   - Or the `netlify.toml` at the repo root handles this automatically.

3. Set Environment Variables in Netlify dashboard:

   | Key                      | Value                                                               |
   | ------------------------ | ------------------------------------------------------------------- |
   | `VITE_SUPABASE_URL`      | Your Supabase project URL                                           |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key                                              |
   | `VITE_SITE_URL`          | Your Netlify URL (e.g. `https://helpq.netlify.app`)                 |
   | `VITE_API_URL`           | Your Render backend URL (e.g. `https://helpq-backend.onrender.com`) |

4. Trigger a deploy. Netlify handles the React SPA routing via the
   `[[redirects]]` rule in `netlify.toml`.

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

Render uses this path as a health check (`healthCheckPath: /health` in
`render.yaml`).

---

## Troubleshooting

| Symptom                 | Likely cause             | Fix                                                        |
| ----------------------- | ------------------------ | ---------------------------------------------------------- |
| 401 on all API calls    | Wrong Supabase keys      | Check `SUPABASE_URL` / `SUPABASE_ANON_KEY` in backend env  |
| CORS error in browser   | `CORS_ORIGIN` mismatch   | Set `CORS_ORIGIN` to the exact Netlify URL on Render       |
| Supabase 403 in db.js   | Service role key missing | Set `SUPABASE_SERVICE_ROLE_KEY` on Render                  |
| Auth emails go nowhere  | Supabase URL config      | Update Supabase Auth → URL configuration with deployed URL |
| Blank page after deploy | SPA routing              | Ensure `netlify.toml` `[[redirects]]` rule is present      |
