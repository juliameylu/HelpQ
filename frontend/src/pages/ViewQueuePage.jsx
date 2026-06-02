import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ClipboardCopy, Loader2, RefreshCw, UserRound } from "lucide-react";
import BackLink from "../components/BackLink.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/useApp.js";
import {
  deleteQueueEntry,
  getQueue,
  getSession,
  updateQueueEntry
} from "../api.js";

function mapStatusForUi(status) {
  if (status === "helping") return "in-progress";
  if (status === "waiting") return "waiting";
  return status;
}

function authErrorText(status) {
  if (status === 401) return "Please sign in again to view this queue.";
  if (status === 403)
    return "You don’t have permission to manage this session.";
  return "Could not load queue.";
}

export default function ViewQueuePage() {
  const { endLiveSession } = useApp();
  const { sessionCode } = useParams();
  const navigate = useNavigate();
  const code = (sessionCode || "").toUpperCase();
  const [session, setSession] = useState(null);
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [endingSession, setEndingSession] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [copied, setCopied] = useState(false);
  const endingRef = useRef(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!code || endingRef.current) return;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [{ session: s }, { queue: rows }] = await Promise.all([
        getSession(code),
        getQueue(code)
      ]);
      if (endingRef.current) return;
      setSession(s);
      setQueue(rows ?? []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err?.status === 401 || err?.status === 403
          ? authErrorText(err.status)
          : err.message || "Could not load queue"
      );
      setSession(null);
      setQueue([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [code]);

  useEffect(() => {
    const bootId = window.setTimeout(() => load(), 0);
    const id = window.setInterval(() => load({ silent: true }), 5000);
    return () => {
      window.clearTimeout(bootId);
      window.clearInterval(id);
    };
  }, [load]);

  async function handleCopyJoinLink() {
    const joinUrl = `${window.location.origin}/join?code=${code}`;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: browser blocked clipboard — silently ignore
    }
  }

  async function setStatus(entryId, status) {
    setBusyId(entryId);
    try {
      await updateQueueEntry(entryId, status);
      await load({ silent: true });
    } catch (err) {
      setError(
        err?.status === 401 || err?.status === 403
          ? authErrorText(err.status)
          : err.message || "Update failed"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeEntry(entryId) {
    setBusyId(entryId);
    try {
      await deleteQueueEntry(entryId);
      await load({ silent: true });
    } catch (err) {
      setError(
        err?.status === 401 || err?.status === 403
          ? authErrorText(err.status)
          : err.message || "Remove failed"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleEndSession() {
    if (!session?.id) return;
    const confirmed = window.confirm(
      "End this live session? Students will no longer be able to join the queue."
    );
    if (!confirmed) return;

    endingRef.current = true;
    setEndingSession(true);
    setError(null);
    try {
      const ended = await endLiveSession(session.id);
      setSession(ended);
      setQueue([]);
      setEndingSession(false);
      endingRef.current = false;
      navigate(session.classId ? `/classes/${session.classId}` : "/", {
        replace: true
      });
    } catch (err) {
      setError(err.message || "Could not end session.");
      setEndingSession(false);
      endingRef.current = false;
    }
  }

  return (
    <DashboardLayout>
      <div className="page-stack standalone-page">
        <BackLink />
        <header className="page-header-row">
          <div>
            <h1>Manage Queue</h1>
            <p>
              Session code: <strong className="mono">{code}</strong>
              {lastUpdated ? (
                <span
                  className="field-message"
                  style={{ display: "inline", marginLeft: 12 }}>
                  Updated{" "}
                  {lastUpdated.toLocaleTimeString("en", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit"
                  })}
                </span>
              ) : null}
            </p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn btn-secondary btn-compact"
              onClick={handleCopyJoinLink}
              title={`Copy /join?code=${code} to clipboard`}
              type="button">
              <ClipboardCopy size={16} aria-hidden="true" />
              {copied ? "Copied!" : "Copy join link"}
            </button>
            <button
              className="btn btn-secondary btn-compact"
              disabled={endingSession || !session}
              onClick={handleEndSession}
              type="button">
              {endingSession ? "Ending…" : "End session"}
            </button>
            <button
              className="btn btn-secondary btn-compact"
              type="button"
              onClick={load}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <p className="field-message error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="field-message">
            <Loader2 className="spin-icon" size={18} aria-hidden="true" />{" "}
            Loading queue…
          </p>
        ) : (
          <>
            <div className="metrics-row manage-metrics">
              <div className="metric">
                <span className="metric-icon">
                  <UserRound size={20} aria-hidden="true" />
                </span>
                <div>
                  <p>Waiting</p>
                  <strong>
                    {queue.filter((e) => e.status === "waiting").length}
                  </strong>
                </div>
              </div>
              <div className="metric">
                <span className="metric-icon">
                  <UserRound size={20} aria-hidden="true" />
                </span>
                <div>
                  <p>Helping now</p>
                  <strong>
                    {queue.filter((e) => e.status === "helping").length}
                  </strong>
                </div>
              </div>
            </div>

            {session ? (
              <p className="field-message">
                Host view for session #{session.id}. Students can join at{" "}
                <Link
                  className="text-link"
                  to={`/join?code=${encodeURIComponent(code)}`}>
                  /join?code={code}
                </Link>
              </p>
            ) : null}

            {queue.length === 0 ? (
              <div className="empty-state card">
                <p>No students in the queue yet.</p>
              </div>
            ) : (
              <ol className="manage-queue-list">
                {queue.map((entry) => (
                  <li className="manage-queue-row card" key={entry.id}>
                    <div className="manage-queue-main">
                      <strong>{entry.studentName}</strong>
                      <p>{entry.question}</p>
                      <span
                        className={`status-pill ${mapStatusForUi(entry.status)}`}>
                        {mapStatusForUi(entry.status)}
                      </span>
                    </div>
                    <div className="manage-queue-actions">
                      {entry.status === "waiting" ? (
                        <button
                          className="btn btn-gold btn-compact"
                          disabled={busyId === entry.id}
                          type="button"
                          onClick={() => setStatus(entry.id, "helping")}>
                          Start helping
                        </button>
                      ) : null}
                      {entry.status === "helping" ? (
                        <button
                          className="btn btn-secondary btn-compact"
                          disabled={busyId === entry.id}
                          type="button"
                          onClick={() => setStatus(entry.id, "done")}>
                          Mark done
                        </button>
                      ) : null}
                      <button
                        className="btn btn-secondary btn-compact"
                        disabled={busyId === entry.id}
                        type="button"
                        onClick={() => removeEntry(entry.id)}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
