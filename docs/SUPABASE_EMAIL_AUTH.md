# Email auth for HelpQ (Supabase)

HelpQ uses **confirm email** on sign-up. This project uses **Supabase’s default mailer** (custom SMTP stays **off**).

---

## Dashboard setup (default email, confirm ON)

### 1. SMTP — leave custom SMTP off

**Authentication** → **Emails** → **SMTP Settings**

- **Enable custom SMTP** → **OFF** (do not fill the form)
- Supabase sends auth emails from their built-in service (`@supabase.io` / `noreply@mail.app.supabase.io`)

### 2. Confirm email — on

**Authentication** → **Providers** → **Email**

- **Confirm email** → **ON**
- Save

### 3. URL configuration — required

**Authentication** → **URL configuration**

| Field | Local dev |
|--------|-----------|
| **Site URL** | `http://127.0.0.1:5173` |
| **Redirect URLs** | Add all of these (exact match): |

```
http://127.0.0.1:5173/login
http://127.0.0.1:5173/reset-password
http://localhost:5173/login
http://localhost:5173/reset-password
```

In `front-end/.env`:

```env
VITE_SITE_URL=http://127.0.0.1:5173
```

### 4. Email template

**Authentication** → **Emails** → **Templates** → **Confirm signup**

- Must include `{{ .ConfirmationURL }}` (default template is fine)

### 5. Rate limits

**Authentication** → **Rate Limits**

- Default mailer is **low volume** (~2 emails/hour per project on free tier)
- Avoid spamming sign-up during testing; wait between attempts
- Use **Resend** on the login page if a link didn’t arrive

---

## What to expect (default mailer limits)

| Topic | Notes |
|--------|--------|
| Delivery | Often slow; check **spam/junk** |
| Cal Poly mail | May filter `@supabase.io` — check quarantine |
| Rate limit | Many sign-ups in a row can silently stop sends |
| Debugging | **Authentication** → **Logs** right after sign-up |
| Stuck users | **Authentication** → **Users** → confirm manually |

---

## App flow (implemented)

1. User **Sign up** → message: confirmation link sent
2. User opens email → clicks link → `/login` → app confirms → signed in
3. **Sign in** before confirming → error + **Resend** link on login page
4. **Forgot password** uses the same default mailer (reset link to `/reset-password`)

---

## Local development (`supabase start`)

No SMTP. Use **Inbucket** from `supabase status` to read fake emails. `supabase/config.toml` has `enable_confirmations = true` under `[auth.email]`.

---

## Later: custom SMTP

Only if default mail isn’t reliable enough for the whole class. See [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
