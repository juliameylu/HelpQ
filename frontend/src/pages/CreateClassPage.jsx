import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import BackLink from "../components/BackLink.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { useApp } from "../context/useApp.js";

export default function CreateClassPage() {
  const navigate = useNavigate();
  const { createClass } = useApp();
  const [form, setForm] = useState({
    title: "",
    code: "",
    description: "",
    joinCode: ""
  });
  const [error, setError] = useState("");

  function handleChange(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setError("");
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await createClass(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(`/classes/${result.course.id}`);
  }

  return (
    <DashboardLayout>
      <div className="page-stack standalone-page">
        <BackLink />
        <header className="page-header-row">
          <div>
            <h1>Create Class</h1>
            <p>Set up a new class for your students to join</p>
          </div>
        </header>

        <form className="card form-card" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="classTitle">
            Class title
          </label>
          <input
            className="form-input"
            id="classTitle"
            onChange={handleChange("title")}
            placeholder="Introduction to Software Engineering"
            value={form.title}
          />

          <label className="form-label" htmlFor="classCode">
            Course code
          </label>
          <input
            className="form-input"
            id="classCode"
            onChange={handleChange("code")}
            placeholder="CSC 307"
            value={form.code}
          />

          <label className="form-label" htmlFor="classDescription">
            Description
          </label>
          <textarea
            className="form-textarea"
            id="classDescription"
            onChange={handleChange("description")}
            placeholder="What is this class about?"
            value={form.description}
          />

          <label className="form-label" htmlFor="joinCode">
            Join code (optional)
          </label>
          <input
            className="form-input form-input-mono"
            id="joinCode"
            onChange={handleChange("joinCode")}
            placeholder="CSC307"
            value={form.joinCode}
          />

          {error ? (
            <p className="field-message error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="btn btn-gold btn-block" type="submit">
            <Plus size={18} aria-hidden="true" />
            Create Class
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
