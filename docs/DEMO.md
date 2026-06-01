# HelpQ — Final Presentation Demo Script

Two-tab demo: **Tab A = Professor**, **Tab B = Student (no login needed)**

---

## Before the Demo (5-min prep)

### 1. Seed demo data

```bash
npm run demo:seed
```

Creates session **DEMO01** with 12 students (waiting / active / done).  
Output shows both URLs — bookmark them:

- Student join: `/join?code=DEMO01`
- Host manage: `/sessions/DEMO01/manage`

### 2. Open two windows / tabs

| Window            | Who                         | URL                                      |
| ----------------- | --------------------------- | ---------------------------------------- |
| Tab A (Professor) | Signed-in professor account | `https://<your-domain>/login`            |
| Tab B (Student)   | Anyone — no account needed  | `https://<your-domain>/join?code=DEMO01` |

### 3. Pre-create a professor account

Sign up at `/login`, choose **Professor** role. Disable email confirmation in
Supabase dashboard for friction-free demo (Auth → Providers → Email → disable
"Confirm email").

---

## Demo Flow (~10 minutes)

### Step 1 — Landing page (30 s)

**Tab B — open in fresh incognito:**  
Navigate to `https://<your-domain>/`

> "This is HelpQ. New visitors — students who just got a session code from their
> professor — land here. No login required. The top button takes them straight
> to the queue."

Point out:

- "Join a session" button (prominent, yellow)
- "No account needed" note in the hero
- 3-step how-it-works section

---

### Step 2 — Student joins the queue (2 min)

**Tab B — click "Join a session"**  
URL becomes `/join`. The session code field is blank.

Type **DEMO01** in the session code field.

> "As soon as the code is entered, HelpQ validates it against the backend — the
> session title appears automatically. The student never leaves this page to
> look anything up."

Fill in:

- Name: **Demo Student**
- Question: **How do I fix a CORS error in my Express server?**

Click **Join queue**.

> "The student is added to the queue. They can see their position, an estimated
> wait, and the live queue — all without creating an account."

**What to show:**

- Position badge: "You're #11 in line."
- Live queue list on the left (10 students ahead)
- Refresh button
- Leave queue button

---

### Step 3 — Professor signs in and sees dashboard (1 min)

**Tab A:**  
Sign in at `/login` with your professor account.

Home page shows:

- Live session card for DEMO01
- "Manage Queue" button

Click **Manage Queue** (or navigate to `/sessions/DEMO01/manage`).

> "The professor's dashboard shows every student in real time — name, question,
> and current status. No refresh needed — the page polls automatically."

Show:

- Maya C. in "in-progress" (already being helped from seed)
- 10 students waiting
- Demo Student at the bottom (just joined)

---

### Step 4 — Professor moves through the queue (2 min)

**Tab A — click "Mark done" on Maya C.**

> "The host marks Maya done. That entry disappears from the active queue."

**Tab A — click "Start helping" on Alex R.**

Alex moves to "in-progress."

**Switch to Tab B.**  
The queue list has updated — Alex is now shown as "In progress" and Demo Student
moved up one position.

> "Both views update in real time through polling. The student watching Tab B
> sees their position change without pressing anything."

---

### Step 5 — Student watches their status change (1.5 min)

**Tab A — find "Demo Student" → click "Start helping".**

**Tab B — watch the status update:**  
The right panel changes from "You're #N in line" to:

> **"The host is ready for you."**

> "This is the key moment in a real office hours — the student knows it's their
> turn without the professor having to shout across a crowded room."

**Tab A — click "Mark done" for Demo Student.**

**Tab B — status updates to:**

> **"You're all set."**

---

### Step 6 — Student leaves the queue (30 s)

Click **"Join again"** in Tab B to reset, then join with code DEMO01 again.

After joining, click **"Leave queue"**.  
Confirm in the dialog.

**Tab B shows:**

> "You left the queue."

**Switch to Tab A:**  
Refresh — Demo Student is gone from the queue.

> "Students can remove themselves if they figure out their problem or leave
> early. The host's list updates immediately."

---

### Step 7 — Error handling (45 s)

**Tab B — click "Join again", then type `BADCODE` in the session code field.**

> "If a student types a code that doesn't exist, we show a clear message — not a
> 404 page or raw JSON."

The helper text under the field shows:

> _"We couldn't find that session code. Check and try again."_

**Try submitting with an empty name:**  
Clear the name field, click Join → inline error appears.

**Try submitting with a blank question:**  
Same — inline validation error, no network request made.

---

### Step 8 — Backend tests (30 s)

In the terminal:

```bash
npm test
```

Show output:

```
Test Suites: 5 passed, 5 total
Tests:       43 passed, 43 total
```

> "43 tests covering auth, validation, 404 handling, role checks, and now the
> full guest student flow — join, queue view, status, and leave."

---

## Demo URLs (fill in your domain)

| Purpose                 | URL                                       |
| ----------------------- | ----------------------------------------- |
| Public landing          | `https://<domain>/`                       |
| Student join (no login) | `https://<domain>/join?code=DEMO01`       |
| Student join (manual)   | `https://<domain>/join`                   |
| Host manage queue       | `https://<domain>/sessions/DEMO01/manage` |
| Sign in / up            | `https://<domain>/login`                  |

---

## Demo Accounts

| Role                        | Suggested Email            | Password    |
| --------------------------- | -------------------------- | ----------- |
| Professor                   | professor@demo.calpoly.edu | `helpq2026` |
| (Students have no accounts) | —                          | —           |

Create the professor account via the sign-up page or Supabase dashboard.

---

## If Something Goes Wrong

| Problem                                             | Fix                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| "We couldn't find that session code" in student tab | Run `npm run demo:seed` again                                        |
| Professor's manage page shows 403                   | Sign in as the professor who ran the seed                            |
| Queue not updating in student tab                   | Click the Refresh button manually                                    |
| Backend CORS error                                  | Add the frontend URL to `CORS_ORIGIN` env var on Render              |
| Can't sign in                                       | Check `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in frontend env |
| Build fails                                         | Run `npm install` from repo root first                               |
