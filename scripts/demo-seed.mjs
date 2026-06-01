/**
 * demo-seed.mjs — Seeds realistic demo data into a HelpQ Supabase database.
 *
 * Creates one live session with 12 students across three status states,
 * making the app look active and meaningful during a demo.
 *
 * Prerequisites:
 *   - A HelpQ Supabase project running (local or cloud)
 *   - At least one professor profile already created (via sign-up or Supabase dashboard)
 *
 * Usage:
 *   node scripts/demo-seed.mjs
 *
 * Required env vars (copy from packages/express-backend/.env.example):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   DEMO_JOIN_CODE   (default: DEMO01)
 *   DEMO_SESSION_TITLE (default: "CSC 307 Office Hours — Demo")
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../packages/express-backend/.env") });
config({ path: resolve(__dirname, "../packages/express-backend/.env.example") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
    "    Copy packages/express-backend/.env.example → packages/express-backend/.env\n" +
    "    and fill in the real values."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const JOIN_CODE = (process.env.DEMO_JOIN_CODE || "DEMO01").toUpperCase();
const SESSION_TITLE =
  process.env.DEMO_SESSION_TITLE || "CSC 307 Office Hours — Demo";

// Realistic student questions for a software-engineering office hours
const DEMO_STUDENTS = [
  { name: "Maya C.", question: "npm install keeps failing — ENOENT error on node_modules.", status: "in_progress" },
  { name: "Alex R.", question: "React state is not updating after form submit.", status: "waiting" },
  { name: "Priya S.", question: "Need help writing a Supertest test for my POST route.", status: "waiting" },
  { name: "Jordan T.", question: "My fetch call returns 401 but the token looks right.", status: "waiting" },
  { name: "Sam W.", question: "Supabase RLS is blocking my SELECT even as the owner.", status: "waiting" },
  { name: "Chloe B.", question: "Express CORS error only in production, works locally.", status: "waiting" },
  { name: "Marcus L.", question: "How do I mock a Supabase call in Jest?", status: "waiting" },
  { name: "Diana F.", question: "Vite proxy is not forwarding /api to my backend.", status: "waiting" },
  { name: "Kevin H.", question: "React Router v7 navigate() is not working after redirect.", status: "waiting" },
  { name: "Nia O.", question: "PostgreSQL foreign key constraint failing on delete.", status: "waiting" },
  { name: "Ryan K.", question: "My GitHub Actions CI fails on npm test but it passes locally.", status: "waiting" },
  { name: "Lena T.", question: "How should I structure a many-to-many in Supabase?", status: "completed" },
];

async function run() {
  console.log("🌱  HelpQ demo seed starting…\n");

  // ── 1. Find a professor to host ──────────────────────────────────────────
  const { data: professors, error: profErr } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "professor")
    .order("created_at", { ascending: true })
    .limit(1);

  if (profErr) {
    console.error("❌  Could not query profiles:", profErr.message);
    process.exit(1);
  }

  if (!professors || professors.length === 0) {
    console.error(
      "❌  No professor profile found.\n" +
      "    Sign up at your deployed HelpQ URL and choose the 'Professor' role first."
    );
    process.exit(1);
  }

  const host = professors[0];
  console.log(`✅  Using professor: ${host.full_name ?? host.id}`);

  // ── 2. Upsert demo session ───────────────────────────────────────────────
  const { data: existingSession } = await supabase
    .from("sessions")
    .select("id, join_code")
    .eq("join_code", JOIN_CODE)
    .maybeSingle();

  let session = existingSession;
  if (!session) {
    const { data: newSession, error: sessErr } = await supabase
      .from("sessions")
      .insert({
        host_id: host.id,
        join_code: JOIN_CODE,
        title: SESSION_TITLE,
        description: "Demo session — students are already in the queue.",
        status: "active"
      })
      .select()
      .maybeSingle();

    if (sessErr) {
      console.error("❌  Could not create session:", sessErr.message);
      process.exit(1);
    }
    session = newSession;
    console.log(`✅  Created session  join_code=${JOIN_CODE}`);
  } else {
    // Make sure existing session is active
    await supabase
      .from("sessions")
      .update({ status: "active", title: SESSION_TITLE })
      .eq("id", session.id);
    console.log(`✅  Reusing session  join_code=${JOIN_CODE}`);
  }

  // ── 3. Clear old demo queue entries ─────────────────────────────────────
  await supabase.from("queue_entries").delete().eq("session_id", session.id);
  console.log("🧹  Cleared previous queue entries");

  // ── 4. Insert demo students ──────────────────────────────────────────────
  const rows = DEMO_STUDENTS.map(({ name, question, status }) => ({
    session_id: session.id,
    student_name: name,
    question,
    status
  }));

  const { error: insertErr } = await supabase
    .from("queue_entries")
    .insert(rows);

  if (insertErr) {
    console.error("❌  Could not insert queue entries:", insertErr.message);
    process.exit(1);
  }

  console.log(`✅  Inserted ${rows.length} students into queue\n`);

  // ── 5. Summary ──────────────────────────────────────────────────────────
  const waiting = rows.filter((r) => r.status === "waiting").length;
  const active = rows.filter((r) => r.status === "in_progress").length;
  const done = rows.filter((r) => r.status === "completed").length;

  console.log("─────────────────────────────────────────────────");
  console.log(`  Session title:  ${SESSION_TITLE}`);
  console.log(`  Join code:      ${JOIN_CODE}`);
  console.log(`  Queue:          ${waiting} waiting · ${active} active · ${done} done`);
  console.log("");
  console.log("  Demo URLs (replace <your-domain> with your deployed URL):");
  console.log(`  Student join:   https://<your-domain>/join?code=${JOIN_CODE}`);
  console.log(`  Host manage:    https://<your-domain>/sessions/${JOIN_CODE}/manage`);
  console.log("─────────────────────────────────────────────────\n");
  console.log("✨  Seed complete. Open the app and sign in as the professor to manage.");
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
