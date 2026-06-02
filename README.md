# HelpQ — Office Hours Queue App

## Project Blurb

HelpQ is a live office-hours queue management app for university courses.
Professors and TAs create a help session and share a short join code; students
use that code to add themselves to the queue — **no account required**. Once in
the queue, students see their real-time position and status. The professor or TA
manages the queue from a host dashboard, marking students as being helped, then
done. The app supports session codes, status transitions (waiting → in progress
→ done), guest student access, and a professor/student two-tab demo flow that
shows the full queue lifecycle.

---

## UI Prototype

TODO: Add UI prototype link and last-updated date before submission.

> If a Figma or other prototype was created during the course, link it here with
> the date it was last updated (e.g., "Figma prototype — last updated
> 2026-04-15").

---

## Documentation

| Document                                                                       | Description                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                                   | Monorepo structure, layered MVC, frontend/backend design     |
| [docs/UML.md](docs/UML.md)                                                     | Class, ER, sequence, component, and use-case diagrams        |
| [docs/API.md](docs/API.md)                                                     | REST API endpoint reference                                  |
| [docs/DEMO.md](docs/DEMO.md)                                                   | Step-by-step final presentation script (professor + student) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                                       | Netlify + Render + Supabase deployment guide                 |
| [docs/TESTING.md](docs/TESTING.md)                                             | Testing approach, coverage, and rubric option                |
| [docs/SECURITY.md](docs/SECURITY.md)                                           | Auth model, secrets, CORS, RLS, input validation             |
| [docs/SUPABASE_EMAIL_AUTH.md](docs/SUPABASE_EMAIL_AUTH.md)                     | Supabase email auth configuration                            |
| [UML.md](UML.md)                                                               | Original SRD UML diagrams                                    |
| [SRD.md](SRD.md)                                                               | Software Requirements Document                               |
| [docs/diagrams/helpq-class-diagram.mmd](docs/diagrams/helpq-class-diagram.mmd) | Mermaid class diagram source                                 |

---

## Features

- **Public landing page** — explains the app; "Join a session" is the primary
  CTA with a note that no account is needed
- **Guest student flow** — students join, view queue position, watch live status
  updates, and leave — without creating an account
- **Professor/host flow** — professors create classes, start sessions, and
  manage the queue from a host dashboard
- **Session codes** — one-click session creation; students join with a
  6-character code
- **Live queue** — entries ordered by join time; status: `waiting` →
  `in_progress` → `done`
- **Auto-polling** — student page polls every 5 seconds; host dashboard every 5
  seconds
- **Class management** — professors create classes with join codes; students
  enroll
- **Office hours scheduling** — recurring weekly schedule slots auto-sync to
  sessions
- **Tested backend** — 74 Jest + Supertest tests across 6 suites;
  `validation.js` at 100% coverage
- **Demo seed** — `npm run demo:seed` creates session DEMO01 with 12 realistic
  students

---

## Tech Stack

| Layer      | Technologies                                              |
| ---------- | --------------------------------------------------------- |
| Frontend   | React 19, Vite 7, Tailwind CSS, React Router v7           |
| Backend    | Node.js 20, Express 5                                     |
| Database   | Supabase (PostgreSQL), schema migrations, RLS policies    |
| Auth       | Supabase email/password auth, JWT Bearer tokens           |
| Testing    | Jest 30, Supertest (74 tests, 6 suites)                   |
| Deployment | Netlify (frontend), Render (backend), Supabase cloud (DB) |
| CI         | GitHub Actions (`ci-testing.yml`)                         |

---

## Development Environment Setup

### Prerequisites

- **Node.js 20+** — check with `node --version`
- **npm 10+** — included with Node 20
- A **Supabase project** (free tier works) — create one at
  [supabase.com](https://supabase.com)
- Git

### Repository Structure

```
helpq/
├── frontend/          React + Vite frontend (port 5173)
├── packages/
│   └── express-backend/ Express API (port 3001)
├── supabase/            DB schema migrations + seed data
├── scripts/             Admin utilities (demo seed)
└── docs/                Project documentation
```

### 1. Clone and Install

```bash
git clone <repo-url>
cd helpq
npm install          # installs all workspaces (frontend + express-backend)
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and note:
   - **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (backend + seed only,
     never expose)
3. Apply migrations:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
4. (Optional for demo) Disable email confirmation: **Dashboard → Auth →
   Providers → Email → disable "Confirm email"**

### 3. Configure Environment Variables

**Frontend:**

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SITE_URL=http://127.0.0.1:5173
# VITE_API_URL=  ← leave blank in dev; Vite proxies /api → :3001
```

**Backend:**

```bash
cp packages/express-backend/.env.example packages/express-backend/.env
```

Edit `packages/express-backend/.env`:

```
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SCHEDULE_TIMEZONE=America/Los_Angeles
```

### 4. Run Locally

```bash
# Terminal 1 — backend (port 3001)
npm run dev:backend

# Terminal 2 — frontend (port 5173, /api proxied to :3001)
npm run dev:frontend
```

Open `http://127.0.0.1:5173/`

### 5. Create Demo Accounts

Sign up at `/login`:

- **Professor account** — choose "Professor" role
- **Student account** — choose "Student" role (or use guest flow — no account
  needed)

### 6. Seed Demo Data

After creating a professor account:

```bash
npm run demo:seed
```

Creates session **DEMO01** with 12 students in various queue states.

**Student join URL:** `/join?code=DEMO01`  
**Host manage URL:** `/sessions/DEMO01/manage`

> The seed script uses `SUPABASE_SERVICE_ROLE_KEY` and must be run locally. Do
> not expose this key in the frontend.

### 7. Common Troubleshooting

| Problem                                                | Fix                                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Backend returns 401 on all routes                      | Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `packages/express-backend/.env` |
| Frontend can't connect to API                          | Make sure backend is running (`npm run dev:backend`) and Vite proxy is configured       |
| `npm run demo:seed` fails "No professor profile found" | Create a professor account via sign-up first                                            |
| Email confirmation blocking sign-in                    | Disable in Supabase Dashboard → Auth → Providers → Email                                |
| CORS error in production                               | Set `CORS_ORIGIN=https://your-netlify-url` on Render backend                            |

---

## Running Tests

```bash
# Backend tests (74 tests, 6 suites)
npm test

# With coverage report
npm run test:coverage

# From backend workspace directly
cd packages/express-backend && npm test
cd packages/express-backend && npm run test:coverage
```

Coverage highlights:

- `utils/validation.js` — **100%** statements, branches, functions, lines
- `routes/guest.js` — **87%** statements, 100% functions

See [docs/TESTING.md](docs/TESTING.md) for the full testing approach and
coverage summary.

---

## Building for Production

```bash
npm run build          # builds frontend to frontend/dist/
```

---

## Demo Flow

See [docs/DEMO.md](docs/DEMO.md) for the complete 10-minute two-tab presentation
script.

Short version:

1. Open `/` → public landing page (no login)
2. Click "Join a session" → `/join?code=DEMO01` → join as student
3. In professor tab: sign in → `/sessions/DEMO01/manage` → see 12-student queue
4. Mark a student active → student tab updates live
5. Mark the student done → student tab shows "You're all set"
6. Student leaves queue → host dashboard reflects it
7. Try invalid code `BADCODE` → friendly error message
8. `npm test` → 74/74 pass

---

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full instructions.

| Component | Platform                          |
| --------- | --------------------------------- |
| Frontend  | Netlify (`netlify.toml` included) |
| Backend   | Render (`render.yaml` included)   |
| Database  | Supabase cloud                    |

---

## Database Schema

Key tables (full schema in `supabase/migrations/`):

| Table                    | Description                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| `profiles`               | User profiles with `role` (student/professor); auto-created via trigger      |
| `classes`                | Instructor-created classes with unique join codes                            |
| `class_enrollments`      | Student/professor ↔ class membership                                         |
| `sessions`               | Office hours sessions with `join_code` and `status` (active/closed)          |
| `queue_entries`          | Queue entries ordered by `created_at`; status: waiting/in_progress/completed |
| `office_hours_schedules` | Recurring weekly schedule slots per class/host                               |

---

## Auth & Access Control

| Layer           | How                                                                            |
| --------------- | ------------------------------------------------------------------------------ |
| Sign-up         | `supabase.auth.signUp()` → DB trigger creates `profiles` row                   |
| Sign-in         | `supabase.auth.signInWithPassword()` → access token returned                   |
| Protected API   | Frontend sends `Authorization: Bearer <token>`; backend verifies with Supabase |
| Role check      | `requireStudent` / `requireProfessor` middleware reads `profiles.role`         |
| Ownership check | Host routes verify `host_id === req.user.id`                                   |
| Guest access    | No auth required for `/api/guest/*` routes — entryId is the capability         |

---

## API Reference

See [docs/API.md](docs/API.md) for the full endpoint reference.

Key endpoints:

| Method   | Path                            | Auth             | Description                  |
| -------- | ------------------------------- | ---------------- | ---------------------------- |
| `GET`    | `/health`                       | —                | Server health check          |
| `GET`    | `/api/sessions/join/:code`      | —                | Look up session by join code |
| `POST`   | `/api/guest/sessions/:id/join`  | —                | Guest student joins queue    |
| `GET`    | `/api/guest/sessions/:id/queue` | —                | Guest queue view             |
| `DELETE` | `/api/guest/queue/:entryId`     | —                | Student leaves queue         |
| `POST`   | `/api/sessions`                 | Bearer           | Create session (professor)   |
| `POST`   | `/api/sessions/:id/queue`       | Bearer + student | Auth'd queue join            |
| `PATCH`  | `/api/queue/:id/status`         | Bearer + host    | Update entry status          |
| `DELETE` | `/api/queue/:id`                | Bearer + host    | Remove entry                 |

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full monorepo structure
and layered MVC diagram.

| Layer         | Technology                              |
| ------------- | --------------------------------------- |
| View          | React 19 pages and components           |
| Controller    | Express 5 route handlers                |
| Service/Model | `services/db.js` (Supabase query layer) |
| Data          | Supabase PostgreSQL + RLS               |

---

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for the full security documentation.

- No secrets committed — `.env` files are gitignored
- `SUPABASE_SERVICE_ROLE_KEY` is backend/admin-only; never in frontend
- CORS is configurable via `CORS_ORIGIN` env var
- All inputs validated via `utils/validation.js` before DB calls
- RLS policies enforce per-user data access at the DB layer

---

## Known Limitations

- Students must refresh or wait for polling (every 5 s) — no WebSocket push
- Guest entry IDs are unprotected (acceptable for class demo; production needs
  signed tokens)
- No frontend automated tests — manual testing only
- No rate limiting on guest endpoints
