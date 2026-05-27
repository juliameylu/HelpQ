import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../context/useApp.js";

export default function ProtectedRoute({ children }) {
  const { user } = useApp();
  const location = useLocation();

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}
