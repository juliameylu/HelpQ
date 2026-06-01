import { Link } from "react-router-dom";
import { GraduationCap, ListOrdered, Users, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing-shell">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <GraduationCap size={22} />
            </span>
            <span className="landing-brand-text">HelpQ</span>
          </div>
          <div className="landing-nav-actions">
            <Link className="btn btn-secondary btn-compact" to="/login">
              Sign in
            </Link>
            <Link
              className="btn btn-gold btn-compact"
              to="/login"
              state={{ mode: "sign-up" }}>
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <p className="eyebrow">Cal Poly SWE 307</p>
          <h1 className="landing-headline">
            Office hours,
            <br />
            <span className="landing-headline-accent">organized.</span>
          </h1>
          <p className="landing-subtitle">
            HelpQ is a live office-hours queue for students, TAs, and
            professors. Students join with a code, see their position in real
            time, and get helped in order — no more crowding the hallway.
          </p>
          <div className="landing-cta-row">
            <Link className="btn btn-gold landing-cta-btn" to="/join">
              Join a session
            </Link>
            <Link className="btn btn-secondary landing-cta-btn" to="/login">
              Professor sign in
            </Link>
          </div>
          <p className="landing-guest-note">
            Students don&apos;t need an account — just enter the code from your
            professor or TA.
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="landing-features">
        <div className="landing-features-inner">
          <h2 className="landing-section-title">How it works</h2>
          <div className="landing-cards">
            <FeatureCard
              icon={<Zap size={28} aria-hidden="true" />}
              title="Professor starts a session"
              body="One click creates a live help session with a shareable join
                    code. No account required for observers."
            />
            <FeatureCard
              icon={<Users size={28} aria-hidden="true" />}
              title="Students join the queue"
              body="Students enter the code, their name, and their question.
                    They see their position and an estimated wait time — updated
                    live."
            />
            <FeatureCard
              icon={<ListOrdered size={28} aria-hidden="true" />}
              title="Host manages the queue"
              body="The host dashboard shows every student, their question, and
                    status. One tap marks a student as being helped, then done."
            />
          </div>
        </div>
      </section>

      {/* ── Demo flow ────────────────────────────────────────────── */}
      <section className="landing-demo">
        <div className="landing-demo-inner">
          <h2 className="landing-section-title">Try the live demo</h2>
          <p
            style={{ color: "#4a6358", marginBottom: 20, textAlign: "center" }}>
            The demo session <strong>DEMO01</strong> is pre-loaded with 12
            students.
          </p>
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginBottom: 28,
              flexWrap: "wrap"
            }}>
            <Link
              className="btn btn-gold landing-cta-btn"
              to="/join?code=DEMO01">
              Join as student (DEMO01)
            </Link>
            <Link className="btn btn-secondary landing-cta-btn" to="/login">
              Sign in as professor
            </Link>
          </div>
          <ol className="landing-demo-steps">
            <li>
              <span className="landing-step-num">1</span>
              <div>
                <strong>Student:</strong> Click &ldquo;Join as student
                (DEMO01)&rdquo; above — enter your name and question. No account
                needed.
              </div>
            </li>
            <li>
              <span className="landing-step-num">2</span>
              <div>
                <strong>Professor:</strong> Sign in → open the host dashboard at{" "}
                <code className="landing-code">/sessions/DEMO01/manage</code>.
              </div>
            </li>
            <li>
              <span className="landing-step-num">3</span>
              <div>
                <strong>Professor:</strong> Click &ldquo;Start helping&rdquo; —
                watch the student&apos;s page update live.
              </div>
            </li>
            <li>
              <span className="landing-step-num">4</span>
              <div>
                <strong>Professor:</strong> Click &ldquo;Mark done&rdquo; —
                student sees &ldquo;You&apos;re all set.&rdquo;
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <p>
          Built for CSC 307 &mdash; Cal Poly SLO &nbsp;·&nbsp;{" "}
          <a
            className="text-link"
            href="https://github.com/juliameylu/HelpQ"
            rel="noopener noreferrer"
            target="_blank">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, body }) {
  return (
    <div className="card landing-feature-card">
      <span className="landing-feature-icon">{icon}</span>
      <h3>{title}</h3>
      <p className="landing-feature-body">{body}</p>
    </div>
  );
}
