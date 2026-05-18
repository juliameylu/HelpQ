# HelpQ Front End

React + Vite + Tailwind CSS prototype for the student frontend. Issue #9 added
the question form foundation, and Issue #8 expands it into a session join page.
The login screen is wired for Supabase OAuth and the `public.profiles` table
from the backend schema.

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

Create `front-end/.env.local` with Ceya's project values:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Only use the public anon key in the frontend. Do not put a Supabase service role
key in Vite env files. If the env vars are missing, the page shows local demo
student access so the UI can still be tested.

For local OAuth testing, add the Vite dev URL, such as `http://127.0.0.1:5173`,
to the Supabase auth redirect URLs.
