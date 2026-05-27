import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackLink({ to = "/", children = "Back to Dashboard" }) {
  return (
    <Link className="back-link" to={to}>
      <ArrowLeft aria-hidden="true" size={16} />
      {children}
    </Link>
  );
}
