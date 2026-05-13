# HelpQ

## Front End Prototype

Issue #9 added the React + Tailwind frontend starter, and Issue #8 expands it
into a student session page in `front-end`. The login flow now uses Supabase
OAuth when `front-end/.env.local` has `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`, then reads the signed-in user's `public.profiles`
record.

```bash
npm install --prefix front-end
npm run dev:frontend
```

The queue page currently uses local browser state and demo session data while
the backend queue API is still being built.
