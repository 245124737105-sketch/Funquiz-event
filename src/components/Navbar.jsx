import React, { useState } from "react";
import { Zap, Volume2, VolumeX, Maximize2, Minimize2, Tv, Shield, Users, LogOut } from "lucide-react";
import { sounds } from "../utils/soundEffects";

export default function Navbar({
  currentView,
  setView,
  activeTeam,
  isFullscreen,
  toggleFullscreen,
  isHostAuth,
  onHostNavClick,
  onHostLock
}) {
  const [muted, setMuted] = useState(sounds.muted);

  const handleMuteToggle = () => {
    const isMute = sounds.toggleMute();
    setMuted(isMute);
    if (!isMute) {
      sounds.playSelect();
    }
  };

  return (
    <header className="header-bar">
      {/* Brand */}
      <div className="logo-badge" onClick={() => setView("player")}>
        <div className="logo-icon-box">
          <Zap size={24} />
        </div>
        <div>
          <div className="logo-text">FUNQUIZ 2026</div>
          <div style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", letterSpacing: "0.08em", fontWeight: 700 }}>
            LIVE TOURNAMENT ARENA
          </div>
        </div>
      </div>

      {/* Nav Switcher */}
      <div className="nav-links">
        <button
          className={`nav-btn ${currentView === "player" ? "active" : ""}`}
          onClick={() => {
            sounds.playSelect();
            setView("player");
          }}
          title="Team Player Arena"
        >
          <Users size={16} />
          <span>Player Arena</span>
        </button>

        <button
          className={`nav-btn ${currentView === "admin" ? "active" : ""}`}
          onClick={() => {
            sounds.playSelect();
            onHostNavClick();
          }}
          title="Proctor & Host Controls (Password Protected)"
          style={{
            borderColor: isHostAuth ? "rgba(16, 185, 129, 0.4)" : undefined,
            background: isHostAuth && currentView === "admin" ? undefined : isHostAuth ? "rgba(16, 185, 129, 0.1)" : undefined
          }}
        >
          <Shield size={16} color={isHostAuth ? "#10b981" : "#cbd5e1"} />
          <span>Host Console</span>
          {!isHostAuth && (
            <span style={{
              background: "rgba(255, 255, 255, 0.1)",
              padding: "2px 6px",
              borderRadius: 6,
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "#fca5a5"
            }}>
              🔒 Locked
            </span>
          )}
        </button>

        {isHostAuth && (
          <button
            className={`nav-btn ${currentView === "projector" ? "active" : ""}`}
            onClick={() => {
              sounds.playSelect();
              setView("projector");
            }}
            title="Projector Venue Display (Host Only)"
            style={{
              borderColor: "rgba(247, 37, 133, 0.4)",
              background: currentView === "projector" ? undefined : "rgba(247, 37, 133, 0.1)"
            }}
          >
            <Tv size={16} color="#f72585" />
            <span>Projector Display</span>
          </button>
        )}
      </div>

      {/* Utility Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {activeTeam && currentView === "player" && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(129, 140, 248, 0.3)",
            padding: "6px 14px",
            borderRadius: "20px"
          }}>
            <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>Team:</span>
            <strong style={{ color: "#00f2fe", fontWeight: 700 }}>{activeTeam.name}</strong>
            <span style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.75rem",
              fontWeight: 800
            }}>
              {activeTeam.score || 0} PTS
            </span>
          </div>
        )}

        {isHostAuth && (
          <button
            className="nav-btn"
            onClick={onHostLock}
            title="Log out from Host Console"
            style={{
              padding: "6px 12px",
              fontSize: "0.8rem",
              borderColor: "rgba(239, 71, 111, 0.4)",
              color: "#fca5a5",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <LogOut size={14} color="#ef476f" />
            <span>Host Logout</span>
          </button>
        )}

        <button
          className="nav-btn"
          onClick={handleMuteToggle}
          title={muted ? "Unmute Sound" : "Mute Sound"}
          style={{ padding: "8px 12px" }}
        >
          {muted ? <VolumeX size={18} color="#f43f5e" /> : <Volume2 size={18} color="#00f2fe" />}
        </button>

        <button
          className="nav-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (Proctor only)" : "Enter Fullscreen"}
          style={{ padding: "8px 12px" }}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </header>
  );
}
