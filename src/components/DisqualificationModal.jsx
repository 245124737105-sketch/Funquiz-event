import React, { useState } from "react";
import { AlertTriangle, ShieldAlert, KeyRound, Unlock } from "lucide-react";
import { sounds } from "../utils/soundEffects";

export default function DisqualificationModal({ team, onReinstate }) {
  const [adminPin, setAdminPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleUnlock = (e) => {
    e.preventDefault();
    // Master emergency proctor passkey
    if (adminPin.trim() === "778899" || adminPin.trim() === "funquiz") {
      sounds.playCorrect();
      onReinstate();
    } else {
      sounds.playWrong();
      setErrorMsg("Incorrect Proctor Master PIN! Contact event proctor.");
    }
  };

  return (
    <div className="disqualification-overlay">
      <div className="disqualification-box">
        <div className="siren-icon">
          <ShieldAlert size={46} />
        </div>

        <div style={{
          display: "inline-block",
          background: "rgba(239, 71, 111, 0.25)",
          border: "1px solid #ef476f",
          color: "#ef476f",
          padding: "6px 14px",
          borderRadius: "20px",
          fontSize: "0.85rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 16
        }}>
          Security Violation Triggered
        </div>

        <h2 style={{ fontSize: "2rem", color: "#fff", marginBottom: 12 }}>
          GAME TERMINATED
        </h2>

        <p style={{ color: "#cbd5e1", fontSize: "1.05rem", lineHeight: 1.5, marginBottom: 20 }}>
          Team <strong style={{ color: "#f43f5e" }}>{team?.name || "Participant"}</strong> has exited Fullscreen Mode or shifted application focus.
        </p>

        <div style={{
          background: "rgba(0, 0, 0, 0.4)",
          border: "1px dashed rgba(239, 71, 111, 0.5)",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 24,
          fontSize: "0.9rem",
          color: "#94a3b8",
          textAlign: "left"
        }}>
          <p style={{ display: "flex", alignItems: "center", gap: 8, color: "#f87171", fontWeight: 600, marginBottom: 4 }}>
            <AlertTriangle size={18} /> Anti-Cheat Protocol:
          </p>
          Per FunQuiz tournament guidelines, unauthorized screen switches immediately end the game. Only event proctors may reinstate this team.
        </div>

        {/* Proctor Override Box */}
        <form onSubmit={handleUnlock} style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <KeyRound size={18} style={{ position: "absolute", left: 14, top: 16, color: "#94a3b8" }} />
              <input
                type="password"
                placeholder="Proctor Unlock Master PIN"
                value={adminPin}
                onChange={(e) => {
                  setAdminPin(e.target.value);
                  setErrorMsg("");
                }}
                className="neon-input"
                style={{ paddingLeft: 42 }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ background: "linear-gradient(135deg, #10b981, #059669)", flexShrink: 0 }}>
              <Unlock size={18} /> Reinstate
            </button>
          </div>

          {errorMsg && (
            <p style={{ color: "#ef476f", fontSize: "0.85rem", marginTop: 10, textAlign: "left" }}>
              {errorMsg}
            </p>
          )}

          <p style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 14 }}>
            Tip: Press <code style={{ color: "#a5b4fc", background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>Ctrl + Alt + X</code> or ask the proctor (Default PIN: 778899).
          </p>
        </form>
      </div>
    </div>
  );
}
