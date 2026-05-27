# HelpQ Front End

React + Vite + Tailwind CSS student frontend for HelpQ. It uses Supabase
email/password auth for student login and calls the Express backend for session
lookup, queue reads, stats, and protected queue submission.

## Run Locally

From the repository root:

```bash
npm install --prefix front-end
npm run dev:frontend
```

Or from this folder:

```bash
npm install
npm run dev
```

The page currently uses local browser state and demo session data because the
backend queue API is not merged into this branch yet.

## Supabase Login

Create `front-end/.env.local` with your project values:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_API_URL=http://127.0.0.1:3001
```

Only use the public anon key in the frontend. Do not put a Supabase service role
key in Vite env files.

For local development:

1. Start local Supabase if you want the local stack.
2. Start the Express backend on `http://127.0.0.1:3001`.
3. Start Vite with `npm run dev:frontend`.

The frontend expects:
- `GET /api/sessions/join/:joinCode`
- `GET /api/sessions/:sessionId/queue`
- `GET /api/sessions/:sessionId/stats`
- `POST /api/sessions/:sessionId/queue` with a bearer token
