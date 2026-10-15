import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import BackgroundCanvas from "./components/BackgroundCanvas";
import TeamLogin from "./components/TeamLogin";
import QuizArena from "./components/QuizArena";
import AdminDashboard from "./components/AdminDashboard";
import ProjectorLeaderboard from "./components/ProjectorLeaderboard";
import DisqualificationModal from "./components/DisqualificationModal";
import HostAuthModal from "./components/HostAuthModal";
import { quizService, INITIAL_STATE } from "./services/quizService";
import { sounds } from "./utils/soundEffects";

export default function App() {
  // Read view from URL: ?view=host → admin, ?view=projector → projector, else player
  const [currentView, setView] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("view");
    if (param === "host") return "admin";
    if (param === "projector") return "projector";
    return "player";
  });
  const [quizState, setQuizState] = useState(INITIAL_STATE);
  const [teams, setTeams] = useState({});
  const [questions, setQuestions] = useState([]);
  const [activeTeam, setActiveTeam] = useState(() => {
    try {
      const saved = sessionStorage.getItem("funquiz_active_team");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Host Authentication Security
  const [isHostAuth, setIsHostAuth] = useState(() => {
    try {
      return sessionStorage.getItem("funquiz_host_authenticated") === "true";
    } catch {
      return false;
    }
  });
  const [isHostAuthModalOpen, setIsHostAuthModalOpen] = useState(false);

  // Subscribe to real-time service updates
  useEffect(() => {
    const unsubState = quizService.onStateChange(setQuizState);
    const unsubTeams = quizService.onTeamsChange((newTeams) => {
      setTeams(newTeams);
      if (activeTeam && newTeams[activeTeam.id]) {
        setActiveTeam(newTeams[activeTeam.id]);
        sessionStorage.setItem("funquiz_active_team", JSON.stringify(newTeams[activeTeam.id]));
      }
    });
    const unsubQuestions = quizService.onQuestionsChange(setQuestions);

    return () => {
      unsubState();
      unsubTeams();
      unsubQuestions();
    };
  }, [activeTeam?.id]);

  // Track Fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  const handleLoginSuccess = async (team) => {
    setActiveTeam(team);
    sessionStorage.setItem("funquiz_active_team", JSON.stringify(team));

    // Request fullscreen upon entering quiz arena ONLY when Anti-Cheat is enabled
    if (quizState.antiCheatEnabled) {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Could not enter fullscreen automatically:", err);
      }
    }
  };

  const handleDisqualify = async (reason) => {
    if (!activeTeam) return;
    await quizService.markDisqualified(activeTeam.id, reason);
  };

  const handleReinstate = async () => {
    if (!activeTeam) return;
    await quizService.reinstateTeam(activeTeam.id);
  };

  // Host Navigation Click Check
  const handleHostNavClick = () => {
    if (isHostAuth) {
      setView("admin");
    } else {
      setIsHostAuthModalOpen(true);
    }
  };

  const handleHostAuthSuccess = () => {
    setIsHostAuth(true);
    sessionStorage.setItem("funquiz_host_authenticated", "true");
    setIsHostAuthModalOpen(false);
    setView("admin");
  };

  const handleLockHost = () => {
    sounds.playSelect();
    setIsHostAuth(false);
    sessionStorage.removeItem("funquiz_host_authenticated");
    setView("player");
  };

  const handleLogout = () => {
    sounds.playSelect();
    setActiveTeam(null);
    sessionStorage.removeItem("funquiz_active_team");
  };

  const isCurrentTeamDisqualified = activeTeam && teams[activeTeam.id]?.disqualified;

  return (
    <div className="app-container">
      {/* Dynamic Ambient Background */}
      <div className="ambient-background">
        <div className="ambient-blob blob-1" />
        <div className="ambient-blob blob-2" />
        <div className="ambient-blob blob-3" />
      </div>
      <BackgroundCanvas />

      {/* Main Navigation Header */}
      <Navbar
        currentView={currentView}
        setView={setView}
        activeTeam={activeTeam}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        isHostAuth={isHostAuth}
        onHostNavClick={handleHostNavClick}
        onHostLock={handleLockHost}
      />

      {/* Host Password Unlock Modal */}
      <HostAuthModal
        isOpen={isHostAuthModalOpen}
        onClose={() => setIsHostAuthModalOpen(false)}
        onAuthSuccess={handleHostAuthSuccess}
      />

      {/* Anti-Cheat Disqualification Siren Modal */}
      {isCurrentTeamDisqualified && (
        <DisqualificationModal
          team={activeTeam}
          onReinstate={handleReinstate}
        />
      )}

      {/* Body Views */}
      <main style={{ position: "relative", zIndex: 10, flex: 1 }}>
        {currentView === "player" && (
          !activeTeam ? (
            <TeamLogin
              teams={teams}
              onLoginSuccess={handleLoginSuccess}
            />
          ) : (
            <QuizArena
              team={teams[activeTeam.id] || activeTeam}
              teams={teams}
              quizState={quizState}
              questions={questions}
              onDisqualify={handleDisqualify}
              onLogout={handleLogout}
            />
          )
        )}

        {currentView === "admin" && (
          isHostAuth ? (
            <AdminDashboard
              quizState={quizState}
              teams={teams}
              questions={questions}
              onLockHost={handleLockHost}
            />
          ) : (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ color: "#ef476f", fontSize: "1.4rem", fontWeight: 800, marginBottom: 12 }}>
                🔒 Host Access Required
              </div>
              <p style={{ color: "#94a3b8", marginBottom: 20 }}>
                Please enter the host passcode to access the command center.
              </p>
              <button onClick={() => setIsHostAuthModalOpen(true)} className="btn-primary">
                Unlock Host Controls
              </button>
            </div>
          )
        )}

        {currentView === "projector" && (
          <ProjectorLeaderboard
            quizState={quizState}
            teams={teams}
            questions={questions}
          />
        )}
      </main>
    </div>
  );
}
