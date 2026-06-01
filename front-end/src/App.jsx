import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProfessorRoute from "./components/ProfessorRoute.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ClassPage from "./pages/ClassPage.jsx";
import CreateClassPage from "./pages/CreateClassPage.jsx";
import CreateOfficeHoursPage from "./pages/CreateOfficeHoursPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import JoinClassPage from "./pages/JoinClassPage.jsx";
import JoinQueuePage from "./pages/JoinQueuePage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import GuestJoinPage from "./pages/GuestJoinPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ViewQueuePage from "./pages/ViewQueuePage.jsx";
import QuickStartSessionPage from "./pages/QuickStartSessionPage.jsx";
import { useApp } from "./context/useApp.js";

function HomeOrLanding() {
  const { user } = useApp();
  return user ? <HomePage /> : <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* Public student join — no auth required */}
        <Route path="/join" element={<GuestJoinPage />} />
        <Route path="/student/join" element={<GuestJoinPage />} />

        {/* Auth'd join (from inside dashboard) */}
        <Route
          path="/dashboard/join"
          element={
            <ProtectedRoute>
              <JoinQueuePage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<HomeOrLanding />} />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/join-class"
          element={
            <ProtectedRoute>
              <JoinClassPage />
            </ProtectedRoute>
          }
        />
        {/* Quick session creation — professor creates a session without a class */}
        <Route
          path="/sessions/new"
          element={
            <ProtectedRoute>
              <QuickStartSessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classes/new"
          element={
            <ProfessorRoute>
              <CreateClassPage />
            </ProfessorRoute>
          }
        />
        <Route
          path="/classes/:classId"
          element={
            <ProtectedRoute>
              <ClassPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classes/:classId/sessions/new"
          element={
            <ProfessorRoute>
              <CreateOfficeHoursPage />
            </ProfessorRoute>
          }
        />
        <Route
          path="/sessions/:sessionCode/manage"
          element={
            <ProfessorRoute>
              <ViewQueuePage />
            </ProfessorRoute>
          }
        />

        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
