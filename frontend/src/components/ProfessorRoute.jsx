import { Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { useApp } from "../context/useApp.js";

export default function ProfessorRoute({ children }) {
  const { isInstructor } = useApp();

  return (
    <ProtectedRoute>
      {isInstructor ? children : <Navigate replace to="/" />}
    </ProtectedRoute>
  );
}
