import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, X } from "lucide-react";
import { useApp } from "../context/useApp.js";

export default function JoinClassModal({ onClose }) {
  const navigate = useNavigate();
  const { joinClassByCode } = useApp();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await joinClassByCode(code);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onClose();
    navigate(`/classes/${result.course.id}`);
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="join-class-title"
        aria-modal="true">
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon-wrap">
              <Hash aria-hidden="true" size={20} />
            </span>
            <h2 id="join-class-title">Join a Class</h2>
          </div>
          <button
            className="modal-close"
            type="button"
            aria-label="Close"
            onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="modal-description">
          Enter the class code provided by your instructor to join the class and
          access office hours.
        </p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="classJoinCode">
            Class Join Code
          </label>
          <input
            autoComplete="off"
            className="form-input form-input-mono"
            id="classJoinCode"
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="Enter class code"
            value={code}
          />
          {error ? (
            <p className="field-message error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-gold" type="submit">
              Join Class
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
