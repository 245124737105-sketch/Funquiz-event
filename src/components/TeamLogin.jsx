import React, { useState, useMemo } from "react";
import { Users, Lock, Sparkles, ShieldAlert, Play, CheckCircle } from "lucide-react";
import { sounds } from "../utils/soundEffects";

export default function TeamLogin({ teams, quizState = {}, onLoginSuccess }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const teamsList = useMemo(() => Object.values(teams || {}), [teams]);

  const filteredTeams = useMemo(() => {
    if (!searchTerm.trim()) return teamsList.slice(0, 15);
    const q = searchTerm.toLowerCase();
    return teamsList.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.player1?.toLowerCase().includes(q) ||
        t.player2?.toLowerCase().includes(q)
    );
  }, [teamsList, searchTerm]);

  const selectedTeam = useMemo(
    () => teamsList.find((t) => t.id === selectedTeamId),
    [teamsList, selectedTeamId]
  );

  const handleSelectTeam = (team) => {
    sounds.playSelect();
    setSelectedTeamId(team.id);
    setSearchTerm(team.name);
    setErrorMsg("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedTeam) {
      setErrorMsg("Please select your assigned Team Name.");
      sounds.playWrong();
      return;
    }

    if (!pin || pin.trim().length !== 6) {
      setErrorMsg("Please enter your 6-digit numeric PIN.");
      sounds.playWrong();
      return;
    }

    if (selectedTeam.pin.trim() !== pin.trim()) {
      setErrorMsg("Invalid 6-Digit Passcode! Check your team registration slip.");
      sounds.playWrong();
      return;
    }

    sounds.playRoundStart();
    onLoginSuccess(selectedTeam);
  };

  return (
    <div style={{
      maxWidth: 620,
      margin: "40px auto",
      padding: "0 20px"
    }} className="fade-in">
      <div className="glass-panel" style={{ padding: "40px 36px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(99, 102, 241, 0.2)",
            border: "1px solid rgba(129, 140, 248, 0.4)",
            color: "#a5b4fc",
            padding: "6px 16px",
            borderRadius: "30px",
            fontSize: "0.85rem",
            fontWeight: 700,
            textTransform: "uppercase",
            marginBottom: 16
          }}>
            <Sparkles size={16} color="#00f2fe" /> Team Arena Gate
          </div>
          <h1 style={{ fontSize: "2.3rem", fontWeight: 800, color: "#fff", marginBottom: 10 }}>
            Enter the Battleground
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "1.05rem" }}>
            Select your paired team credentials generated from registration.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Team Selector / Search */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
              Team Name
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search or select your team name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedTeamId("");
                }}
                className="neon-input"
              />
            </div>

            {/* Quick Suggestions Dropdown */}
            {(!selectedTeamId || searchTerm !== selectedTeam?.name) && filteredTeams.length > 0 && (
              <div style={{
                maxHeight: 180,
                overflowY: "auto",
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid var(--border-glass)",
                borderRadius: 12,
                marginTop: 6,
                padding: "6px 0",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
              }}>
                {filteredTeams.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTeam(t)}
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "background 0.15s ease"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99, 102, 241, 0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <strong style={{ color: "#fff", fontSize: "0.95rem" }}>{t.name}</strong>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                        {t.player1} & {t.player2}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#00f2fe", fontWeight: 700 }}>
                      Select
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Team Roster Card */}
          {selectedTeam && (
            <div style={{
              background: "rgba(6, 214, 160, 0.08)",
              border: "1px solid rgba(6, 214, 160, 0.3)",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 14
            }}>
              <CheckCircle size={28} color="#06d6a0" />
              <div>
                <div style={{ color: "#06d6a0", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>
                  Verified Team Pair
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                  {selectedTeam.player1} &amp; {selectedTeam.player2}
                </div>
              </div>
            </div>
          )}

          {/* 6-Digit PIN Input */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}>
              6-Digit Team Passcode (PIN)
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={20} style={{ position: "absolute", left: 16, top: 16, color: "#94a3b8" }} />
              <input
                type="password"
                maxLength={6}
                placeholder="• • • • • •"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ""));
                  setErrorMsg("");
                }}
                className="neon-input"
                style={{
                  paddingLeft: 46,
                  letterSpacing: "0.4em",
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  textAlign: "center"
                }}
              />
            </div>
          </div>

          {/* Anti-Cheat Notice (Shown only when Anti-Cheat is activated by Host) */}
          {quizState.antiCheatEnabled && (
            <div style={{
              background: "rgba(239, 71, 111, 0.1)",
              border: "1px solid rgba(239, 71, 111, 0.3)",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 28,
              display: "flex",
              alignItems: "flex-start",
              gap: 12
            }}>
              <ShieldAlert size={22} color="#ef476f" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: "0.85rem", color: "#fca5a5", lineHeight: 1.45 }}>
                <strong>Full Screen Anti-Cheat Protocol:</strong> Starting the quiz locks the screen into Fullscreen. Exiting fullscreen or shifting window focus will <strong>immediately terminate your game</strong>!
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: "rgba(239, 71, 111, 0.2)",
              color: "#ef476f",
              padding: "10px 14px",
              borderRadius: 10,
              fontSize: "0.9rem",
              fontWeight: 600,
              marginBottom: 20,
              textAlign: "center"
            }}>
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", padding: "16px", fontSize: "1.1rem" }}
          >
            <Play size={20} fill="#fff" /> {quizState.antiCheatEnabled ? "ENTER ARENA (FULLSCREEN)" : "ENTER ARENA"}
          </button>
        </form>
      </div>
    </div>
  );
}
