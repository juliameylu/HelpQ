import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "./AppContextBase.js";
import {
  createClass as apiCreateClass,
  createSession as apiCreateSession,
  endSession as apiEndSession,
  enrichSessionsWithQueueCounts,
  getMyClasses,
  joinClass as apiJoinClass,
  getSessionsByClass,
  getSessionsByHost
} from "../api.js";
import { enrichClassWithInstructor } from "../data/mockData.js";
import {
  loginRedirectUrl,
  passwordResetRedirectUrl,
  validatePasswordMatch
} from "../lib/authValidation.js";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient.js";

const STORAGE_KEY = "helpq-app-state-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function AppProvider({ children }) {
  const persisted = loadState();

  const [user, setUser] = useState(null);
  const [authHydrated, setAuthHydrated] = useState(!isSupabaseConfigured);
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsHydrated, setSessionsHydrated] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [notifications, setNotifications] = useState(
    persisted?.notifications ?? []
  );
  const [settings, setSettings] = useState(persisted?.settings ?? {});
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState(null);
  const recentlyEndedSessionIdsRef = useRef(new Set());

  useEffect(() => {
    saveState({
      notifications,
      settings
    });
  }, [notifications, settings]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return undefined;
    }

    let isMounted = true;

    async function loadCurrentSession() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!data.session?.user) {
        setUser(null);
        setAuthHydrated(true);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, avatar_url")
          .eq("id", data.session.user.id)
          .maybeSingle();

        if (!profile) {
          setUser(null);
          setAuthHydrated(true);
          return;
        }

        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.full_name || profile.email,
          role: profile.role,
          avatarUrl: profile.avatar_url || ""
        });
        setAuthHydrated(true);
      } catch {
        setUser(null);
        setAuthHydrated(true);
      }
    }

    loadCurrentSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, sessionData) => {
      if (!sessionData?.user) {
        setUser(null);
        setAuthHydrated(true);
        return;
      }
      setAuthHydrated(false);
      loadCurrentSession();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshClasses = useCallback(async () => {
    if (!authHydrated) {
      return;
    }

    if (!user) {
      setClasses([]);
      return;
    }

    setClassesLoading(true);
    setClassesError(null);

    try {
      const rows = await getMyClasses();
      setClasses(rows.map(enrichClassWithInstructor));
    } catch (err) {
      setClasses([]);
      setClassesError(err.message || "Could not load classes.");
    } finally {
      setClassesLoading(false);
    }
  }, [authHydrated, user]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refreshClasses();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshClasses]);

  const refreshSessions = useCallback(
    async ({ silent = false } = {}) => {
      if (!authHydrated) {
        return;
      }

      if (!user) {
        setSessions([]);
        setSessionsHydrated(false);
        return;
      }

      if (!silent) {
        setSessionsLoading(true);
      }
      setSessionsError(null);

      try {
        let rows = [];
        if (user.role === "professor") {
          const hosted = await getSessionsByHost(user.id);
          rows = hosted.filter((session) => session.status === "live");
        } else if (classes.length > 0) {
          const lists = await Promise.all(
            classes.map((course) => getSessionsByClass(course.id))
          );
          const seen = new Set();
          rows = lists.flat().filter((session) => {
            if (seen.has(session.id)) return false;
            seen.add(session.id);
            return true;
          });
        }
        const enriched = await enrichSessionsWithQueueCounts(rows);
        const endedIds = recentlyEndedSessionIdsRef.current;
        setSessions(
          enriched.filter((session) => !endedIds.has(String(session.id)))
        );
      } catch (err) {
        if (!silent) {
          setSessions([]);
        }
        setSessionsError(
          err.message || "Could not load sessions. Is the API server running?"
        );
      } finally {
        setSessionsHydrated(true);
        if (!silent) {
          setSessionsLoading(false);
        }
      }
    },
    [authHydrated, user, classes]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      refreshSessions({ silent: true });
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshSessions]);

  useEffect(() => {
    if (!user) return undefined;

    const intervalId = window.setInterval(() => {
      void refreshSessions({ silent: true });
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [user, refreshSessions]);

  const enrolledClasses = useMemo(() => {
    const liveByClass = sessions.reduce((acc, s) => {
      if (s.status !== "live" || !s.classId) return acc;
      acc[s.classId] = (acc[s.classId] || 0) + 1;
      return acc;
    }, {});

    return classes.map((c) => ({
      ...c,
      liveHours: liveByClass[c.id] || 0
    }));
  }, [classes, sessions]);

  const liveSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "live")
        .filter((s) => {
          if (user?.role === "professor") return true;
          return s.classId && classes.some((c) => c.id === s.classId);
        })
        .map((s) => {
          const course = classes.find((c) => c.id === s.classId);
          return {
            ...s,
            courseCode: course?.code ?? "",
            instructor: course?.instructor ?? ""
          };
        }),
    [sessions, classes, user?.role]
  );

  const login = useCallback(async (email, password) => {
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    if (!email.trim() || !password.trim()) {
      return { ok: false, error: "Email and password are required." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      const message = error.message || "Sign-in failed.";
      const needsEmailConfirmation =
        /email not confirmed/i.test(message) ||
        error.code === "email_not_confirmed";

      return {
        ok: false,
        error: needsEmailConfirmation
          ? "Confirm your email before signing in. Use the link we sent, or resend below."
          : message,
        needsEmailConfirmation
      };
    }

    return { ok: true };
  }, []);

  const signup = useCallback(
    async ({ email, password, confirmPassword, fullName, role }) => {
      if (!supabase) {
        return { ok: false, error: "Supabase is not configured." };
      }

      if (!email.trim() || !fullName.trim()) {
        return {
          ok: false,
          error: "Email and full name are required."
        };
      }

      const passwordError = validatePasswordMatch(password, confirmPassword);
      if (passwordError) {
        return { ok: false, error: passwordError };
      }

      if (role !== "student" && role !== "professor") {
        return { ok: false, error: "Choose student or professor." };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: loginRedirectUrl() || undefined,
          data: {
            full_name: fullName.trim(),
            role
          }
        }
      });

      if (error) {
        return { ok: false, error: error.message || "Sign-up failed." };
      }

      const needsEmailConfirmation = !data.session;

      return {
        ok: true,
        needsEmailConfirmation,
        message: needsEmailConfirmation
          ? "Account created. We sent a confirmation link to your email — open it, then sign in here."
          : "Account created. You can sign in now."
      };
    },
    []
  );

  const resendSignupConfirmation = useCallback(async (email) => {
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    if (!email.trim()) {
      return { ok: false, error: "Email is required." };
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: loginRedirectUrl() || undefined
      }
    });

    if (error) {
      return {
        ok: false,
        error: error.message || "Could not resend confirmation email."
      };
    }

    return {
      ok: true,
      message:
        "If your account is unconfirmed, a new confirmation email was sent. Check spam and wait a few minutes."
    };
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    if (!email.trim()) {
      return { ok: false, error: "Email is required." };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: passwordResetRedirectUrl() }
    );

    if (error) {
      return {
        ok: false,
        error: error.message || "Could not send reset email."
      };
    }

    return {
      ok: true,
      message:
        "If an account exists for that email, you will receive a password reset link shortly."
    };
  }, []);

  const updatePassword = useCallback(async ({ password, confirmPassword }) => {
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    const passwordError = validatePasswordMatch(password, confirmPassword);
    if (passwordError) {
      return { ok: false, error: passwordError };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return {
        ok: false,
        error: error.message || "Could not update password."
      };
    }

    await supabase.auth.signOut();

    return {
      ok: true,
      message: "Password updated. Sign in with your new password."
    };
  }, []);

  const logout = useCallback(() => {
    void supabase?.auth.signOut();
  }, []);

  const joinClassByCode = useCallback(
    async (rawCode) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return { ok: false, error: "Enter a class join code." };

      try {
        const { course } = await apiJoinClass(code);
        await refreshClasses();
        return { ok: true, course };
      } catch (err) {
        return {
          ok: false,
          error: err.message || `No class found for code ${code}.`
        };
      }
    },
    [refreshClasses]
  );

  const addOfficeHourSession = useCallback(
    async ({ classId, title, description }) => {
      if (!user?.id) {
        throw new Error("You must be logged in to create a session.");
      }
      const { session } = await apiCreateSession({
        title: title.trim(),
        description: description.trim(),
        classId
      });
      await refreshSessions();
      return session;
    },
    [user, refreshSessions]
  );

  const endLiveSession = useCallback(
    async (sessionId) => {
      if (!user?.id) {
        throw new Error("You must be logged in to end a session.");
      }
      const endedId = String(sessionId);
      recentlyEndedSessionIdsRef.current.add(endedId);
      setSessions((prev) => prev.filter((row) => String(row.id) !== endedId));
      try {
        const session = await apiEndSession(sessionId);
        void refreshSessions({ silent: true });
        return session;
      } catch (err) {
        recentlyEndedSessionIdsRef.current.delete(endedId);
        void refreshSessions({ silent: true });
        throw err;
      }
    },
    [user, refreshSessions]
  );

  const markNotificationRead = useCallback((id) => {
    setNotifications((list) =>
      list.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((list) => list.map((n) => ({ ...n, unread: false })));
  }, []);

  const deleteNotification = useCallback((id) => {
    setNotifications((list) => list.filter((n) => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const createClass = useCallback(
    async ({ title, code, description, joinCode }) => {
      try {
        const { course } = await apiCreateClass({
          title,
          code,
          description,
          joinCode
        });
        await refreshClasses();
        return { ok: true, course };
      } catch (err) {
        return { ok: false, error: err.message || "Could not create class." };
      }
    },
    [refreshClasses]
  );

  const value = {
    user,
    settings,
    enrolledClasses,
    liveSessions,
    sessions,
    sessionsLoading,
    sessionsHydrated,
    sessionsError,
    classesLoading,
    classesError,
    refreshSessions,
    notifications,
    login,
    signup,
    resendSignupConfirmation,
    requestPasswordReset,
    updatePassword,
    logout,
    joinClassByCode,
    addOfficeHourSession,
    endLiveSession,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearNotifications,
    updateSettings,
    createClass,
    isInstructor: user?.role === "professor",
    getClassById: (id) => classes.find((c) => c.id === id) ?? null
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// useApp lives in ./useApp.js to satisfy react-refresh/only-export-components.
