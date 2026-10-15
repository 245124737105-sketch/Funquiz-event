import React, { useState } from "react";
import { Lock, ShieldAlert, KeyRound, ArrowRight, X } from "lucide-react";
import { sounds } from "../utils/soundEffects";

export default function HostAuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleUnlock = (e) => {
    e.preventDefault();
    const storedPass = localStorage.getItem("funquiz_host_password") || "admin2026";

    if (password.trim() === storedPass || password.trim() === "admin2026") {
      sounds.playCorrect();
      setErrorMsg("");
      onAuthSuccess();
    } else {
      sounds.playWrong();
      setErrorMsg("Incorrect Host Passcode! Access Denied.");
    }
  };

  return (
    <div className="disqualification-overlay" style={{ background: "rgba(10, 14, 30, 0.88)" }}>
      <div className="glass-panel" style={{
        maxWidth: 480,
        width: "100%",
        padding: "36px 32px",
        position: "relative",
        border: "1px solid rgba(129, 140, 248, 0.4)",
        boxShadow: "0 0 50px rgba(99, 102, 241, 0.3)"
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer"
          }}
        >
          <X size={20} />
        </button>

        {/* Icon Header */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          color: "#fff",
          boxShadow: "0 0 25px rgba(129, 140, 248, 0.5)"
        }}>
          <Lock size={32} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.75rem", color: "#fff", fontWeight: 800, marginBottom: 8 }}>
            Host Access Restricted
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
            This command center is reserved exclusively for event proctors and administrators.
          </p>
        </div>

        <form onSubmit={handleUnlock}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
              Admin Master Passcode
            </label>
            <div style={{ position: "relative" }}>
              <KeyRound size={18} style={{ position: "absolute", left: 16, top: 16, color: "#818cf8" }} />
              <input
                type="password"
                placeholder="Enter host password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg("");
                }}
                className="neon-input"
                style={{ paddingLeft: 46 }}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "0.75rem", color: "#64748b" }}>
              <span>Default Host Passcode: <code style={{ color: "#00f2fe" }}>admin2026</code></span>
            </div>
          </div>

          {errorMsg && (
            <div style={{
              background: "rgba(239, 71, 111, 0.2)",
              color: "#ef476f",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: "0.9rem",
              fontWeight: 600,
              marginBottom: 18,
              textAlign: "center"
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              className="nav-btn"
              style={{ flex: 1, justifyContent: "center", padding: "14px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ flex: 2, padding: "14px" }}
            >
              Unlock Console <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
