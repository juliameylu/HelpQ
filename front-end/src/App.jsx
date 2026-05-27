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
import LoginPage from "./pages/LoginPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ViewQueuePage from "./pages/ViewQueuePage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/join" element={<JoinQueuePage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
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
