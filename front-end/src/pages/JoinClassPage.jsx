import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import JoinClassModal from "../components/JoinClassModal.jsx";

export default function JoinClassPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <JoinClassModal onClose={() => navigate("/")} />
    </DashboardLayout>
  );
}
