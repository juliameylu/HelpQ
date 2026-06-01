# HelpQ — Security Documentation

## Overview

HelpQ uses Supabase Auth for professor/TA account management. Students can join
queues as guests without creating accounts; their session data is scoped to a
join code and an entry ID stored in `localStorage`.

---

## Authentication Model

### Professor / TA Users

- Accounts are created via Supabase Auth (email/password)
- Sign-up sets a `role` field (`student` or `professor`) in the `profiles` table
  via a DB trigger (`handle_new_user`)
- Sign-in returns a Supabase JWT access token
- The frontend stores the JWT in Supabase's managed session (not in
  `localStorage` directly)
- The frontend sends `Authorization: Bearer <token>` on all protected API calls
- The backend verifies the token with `supabase.auth.getUser(token)` on every
  protected request

### Student Guest Users

- Students do NOT need an account to join a queue
- They submit a name and question via `POST /api/guest/sessions/:id/join`
- The backend returns an `entryId` (UUID)
- The frontend stores
  `{ entryId, sessionId, sessionCode, studentName, question }` in `localStorage`
- The `entryId` acts as a **capability token** — whoever holds it can view
  status and leave the queue
- No sensitive personal data is stored; the `studentName` and `question` are
  display values only

---

## Authorization Middleware

Located in `packages/express-backend/src/middleware/auth.js`:

| Middleware         | Behavior                                                  |
| ------------------ | --------------------------------------------------------- |
| `requireAuth`      | Validates the Bearer token with Supabase; sets `req.user` |
| `requireStudent`   | Fetches profile; checks `role === "student"`              |
| `requireProfessor` | Fetches profile; checks `role === "professor"`            |

**Ownership checks** are enforced on write operations: a host can only
update/delete queue entries for sessions they own. This is checked with
`db.getSessionByIdForHost(sessionId, req.user.id)`.

---

## Public Endpoints (No Auth Required)

The following endpoints are intentionally unauthenticated — they support the
guest student flow:

- `GET /api/sessions/join/:code` — read-only session lookup by join code
- `GET /api/guest/sessions/join/:code` — same, on guest router
- `POST /api/guest/sessions/:id/join` — guest queue join
- `GET /api/guest/sessions/:id/queue` — guest queue view
- `GET /api/guest/queue/:entryId` — guest entry status
- `DELETE /api/guest/queue/:entryId` — guest leave (by entry ID capability)
- `GET /health` — server liveness check

**Scope of risk:** A student who knows another student's `entryId` could delete
their entry. For a classroom demo this is acceptable. In production, add a
signed short-lived token or session-scoped token.

---

## Secrets and Credentials

### What must NOT be committed

- `.env` and `.env.local` files (all are gitignored via `.gitignore`)
- `SUPABASE_SERVICE_ROLE_KEY` — admin-level Supabase key; never in frontend or
  version control
- Any real API keys or production passwords

### What IS committed

- `.env.example` files with placeholder values only
- Supabase `anon` key is intentionally public (it is a client-side key
  restricted by RLS)

### Environment variable locations

| Variable                    | Where                           | Purpose                                   |
| --------------------------- | ------------------------------- | ----------------------------------------- |
| `VITE_SUPABASE_URL`         | `front-end/.env.local`          | Supabase project URL                      |
| `VITE_SUPABASE_ANON_KEY`    | `front-end/.env.local`          | Supabase anonymous key (public by design) |
| `VITE_API_URL`              | `front-end/.env.local`          | Backend URL in production                 |
| `SUPABASE_URL`              | `packages/express-backend/.env` | Supabase project URL                      |
| `SUPABASE_ANON_KEY`         | `packages/express-backend/.env` | Supabase anon key                         |
| `SUPABASE_SERVICE_ROLE_KEY` | `packages/express-backend/.env` | Admin key — backend only                  |
| `CORS_ORIGIN`               | `packages/express-backend/.env` | Allowed frontend origins in production    |
| `PORT`                      | `packages/express-backend/.env` | Backend port                              |

The demo seed script (`scripts/demo-seed.mjs`) uses `SUPABASE_SERVICE_ROLE_KEY`
and must be run locally by an admin. It must never be exposed in the frontend.

---

## CORS

The backend uses the `cors` npm package. Behavior:

- **Development / CI / tests:** `CORS_ORIGIN` is not set → all origins allowed
  (`*`)
- **Production:** Set `CORS_ORIGIN=https://your-netlify-domain.netlify.app`
  (comma-separated for multiple) → only listed origins are allowed

```javascript
// packages/express-backend/src/app.js
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : "*";
```

**Action required before production:** Always set `CORS_ORIGIN` on your Render
deployment to your exact Netlify URL.

---

## Row-Level Security (RLS)

Supabase RLS policies are defined in the migration files
(`supabase/migrations/`). Key policies:

- `profiles` — users can only read/update their own profile
- `sessions` — session hosts can update; all authenticated users can read
- `queue_entries` — host can update/delete; students can insert

The backend additionally enforces ownership in route handlers (defense in depth
— not relying on RLS alone).

---

## Input Validation

All input is validated before DB operations using `src/utils/validation.js`:

- `validateUuid(value, fieldName)` — RFC4122 UUID pattern check
- `validateRequiredTrimmedString(value, fieldName, { maxLength })` — required,
  trimmed, length-bounded

Validation errors return `400 validation_failed` with per-field `details`. Stack
traces are never sent to clients.

---

## Error Handling

`src/utils/errors.js` defines standardized error responses. No Express stack
traces or internal details are exposed in HTTP responses. Production builds have
`NODE_ENV=production` to suppress verbose error output.

---

## Security Audit Results

**Secrets scan:**

- `git ls-files | grep "\.env"` → no `.env` files committed ✅
- `.gitignore` excludes `.env`, `.env.local`, `.env.*` ✅
- `!.env.example` and `!.env.local.example` allow example files to be tracked ✅
- `coverage/` is gitignored ✅
- `scripts/` was previously gitignored (accidentally hiding the seed script) —
  **fixed** ✅

**Hard-coded URLs:**

- No `localhost` URLs hard-coded in source — all backend URLs come from
  `VITE_API_URL` or Vite proxy
- Supabase URL comes from `VITE_SUPABASE_URL` — no hard-coded project refs in
  source

---

## Known Limitations

| Limitation                                                                | Severity           | Production Fix                                  |
| ------------------------------------------------------------------------- | ------------------ | ----------------------------------------------- |
| Guest `entryId` is unprotected — anyone who knows it can delete the entry | Low (demo context) | Add signed short-lived JWT for entry capability |
| No rate limiting on guest endpoints                                       | Medium             | Add `express-rate-limit`                        |
| No CAPTCHA on queue join                                                  | Low                | Add reCAPTCHA on guest join form                |
| Email confirmation disabled for demo ease                                 | Low                | Re-enable for production                        |
| `CORS_ORIGIN=*` in dev/CI                                                 | Acceptable for dev | Always set in production Render deployment      |
| No refresh token rotation handling in frontend                            | Low                | Supabase JS client manages this automatically   |
