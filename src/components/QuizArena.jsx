import React, { useState, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import { Flame, Award, HelpCircle, Check, X, Shield, Clock, Trophy, LogOut } from "lucide-react";
import { sounds } from "../utils/soundEffects";
import { quizService } from "../services/quizService";

export default function QuizArena({ team, teams = {}, quizState, questions, onDisqualify, onLogout }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null); // { isCorrect, pointsEarned, selectedOption }
  const [answeredForQuestionId, setAnsweredForQuestionId] = useState(null); // track which question was answered
  const [timeLeft, setTimeLeft] = useState(20);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Active question calculation
  const currentRound = quizState.currentRound || 1;
  const questionIndex = quizState.questionIndex || 0;

  // Sorted teams for participant leaderboard glance
  const sortedTeams = useMemo(() => {
    return Object.values(teams || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [teams]);

  const teamRank = useMemo(() => {
    const idx = sortedTeams.findIndex((t) => t.id === team.id);
    return idx >= 0 ? idx + 1 : "-";
  }, [sortedTeams, team.id]);

  const top3 = sortedTeams.slice(0, 3);
  const restTop = sortedTeams.slice(3, 8);

  // All questions for the current round — used in JSX for "Q X of Y" counter
  const roundQuestions = useMemo(
    () => questions.filter((q) => q.round === currentRound),
    [questions, currentRound]
  );

  // Filter questions for current round and match activeQuestionId accurately
  const currentQuestion = useMemo(() => {
    if (quizState.activeQuestionId) {
      const found = questions.find((q) => q.id === quizState.activeQuestionId);
      if (found) return found;
    }
    return roundQuestions[questionIndex] || roundQuestions[0] || questions[0];
  }, [questions, quizState.activeQuestionId, currentRound, questionIndex, roundQuestions]);

  const totalTime = currentQuestion?.timeLimit || 20;

  // Retrieve any answer already saved for this team & question
  const savedAnswer = team?.answers?.[currentQuestion?.id];

  // The selected option: prefer local state, then what was saved for THIS question
  const userOption = (selectedOption || savedAnswer?.selectedOption || "").trim().toUpperCase();
  const correctOption = (currentQuestion?.correct || "").trim().toUpperCase();

  // isAnswerCorrect: use submissionResult from this session (most reliable — set immediately at submit),
  // then fall back to savedAnswer.isCorrect (from team prop), then compute from strings.
  // This avoids the bug where savedAnswer lookup fails due to question ID mismatch or stale team prop.
  const isAnswerCorrect = (() => {
    // Priority 1: direct result from submitAnswer() call this session
    if (submissionResult !== null && answeredForQuestionId === currentQuestion?.id) {
      return Boolean(submissionResult.isCorrect);
    }
    // Priority 2: isCorrect flag stored in savedAnswer (from team prop)
    if (savedAnswer && typeof savedAnswer.isCorrect === 'boolean') {
      return savedAnswer.isCorrect;
    }
    // Priority 3: string comparison fallback
    return Boolean(userOption && correctOption && userOption === correctOption);
  })();

  const isLocked = Boolean(hasSubmitted || savedAnswer || quizState.status !== "QUESTION_ACTIVE" || timeLeft <= 0);

  // Sync / Reset local answer selection ONLY when a new question ID is loaded
  useEffect(() => {
    setSelectedOption(null);
    setHasSubmitted(false);
    setSubmissionResult(null);
    setAnsweredForQuestionId(null);
    setTimeLeft(currentQuestion?.timeLimit || 20);

    if (quizState.status === "QUESTION_ACTIVE") {
      sounds.playRoundStart();
    }
  }, [currentQuestion?.id]);

  // Countdown timer logic
  useEffect(() => {
    if (quizState.status !== "QUESTION_ACTIVE") return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        if (prev <= 5) {
          sounds.playUrgentTick();
        } else if (prev <= 10) {
          sounds.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quizState.status, currentQuestion?.id]);

  // Handle Answer Selection
  const handleSelectOption = async (optionKey) => {
    if (isLocked || quizState.status !== "QUESTION_ACTIVE" || timeLeft <= 0) return;

    const optUpper = String(optionKey).trim().toUpperCase();
    const questionIdAtSubmit = currentQuestion?.id;

    setSelectedOption(optUpper);
    setHasSubmitted(true);
    setAnsweredForQuestionId(questionIdAtSubmit);
    sounds.playSelect();

    const result = await quizService.submitAnswer(
      team.id,
      questionIdAtSubmit,
      optUpper,
      timeLeft,
      totalTime
    );

    // Store result with the question context — this is the ground truth for correctness
    setSubmissionResult(result);
  };

  const [isWrongShake, setIsWrongShake] = useState(false);

  // Trigger celebration or wrong answer shake on Answer Reveal
  useEffect(() => {
    if (quizState.status === "QUESTION_REVEALED") {
      // Use the same priority logic as isAnswerCorrect to avoid mismatch
      let isCorrect = false;
      if (submissionResult !== null && answeredForQuestionId === currentQuestion?.id) {
        isCorrect = Boolean(submissionResult.isCorrect);
      } else {
        const sv = team?.answers?.[currentQuestion?.id];
        if (sv && typeof sv.isCorrect === 'boolean') {
          isCorrect = sv.isCorrect;
        } else {
          const userChoice = (selectedOption || sv?.selectedOption || "").trim().toUpperCase();
          const correctChoice = (currentQuestion?.correct || "").trim().toUpperCase();
          isCorrect = Boolean(userChoice && correctChoice && userChoice === correctChoice);
        }
      }

      if (isCorrect) {
        sounds.playCorrect();
        setIsWrongShake(false);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        sounds.playWrong();
        setIsWrongShake(true);
        const timer = setTimeout(() => setIsWrongShake(false), 900);
        return () => clearTimeout(timer);
      }
    } else {
      setIsWrongShake(false);
    }
  }, [quizState.status, currentQuestion?.id, submissionResult, answeredForQuestionId]);

  // Anti-Cheat Listeners (Fullscreen exit & Tab switch)
  useEffect(() => {
    // Skip completely if Host has disabled Anti-Cheat (e.g. testing on single laptop)
    if (!quizState.antiCheatEnabled) return;

    let proctorBypass = false;

    // Grace period: ignore events fired within 2s of enabling anti-cheat
    // (prevents instant disqualify when toggling the switch)
    let ready = false;
    const graceTimer = setTimeout(() => { ready = true; }, 2000);

    const handleKeyDown = (e) => {
      // Special key combo: Ctrl + Alt + X — proctor override
      if (e.ctrlKey && e.altKey && (e.key === "x" || e.key === "X")) {
        proctorBypass = true;
        sounds.playCorrect();
        alert("Proctor Authorized Exit Mode engaged.");
      }
    };

    const handleFullscreenChange = () => {
      if (!ready) return;
      if (!document.fullscreenElement && !proctorBypass) {
        sounds.playAlarm();
        onDisqualify("Exited Fullscreen Mode without Proctor authorization.");
      }
    };

    const handleVisibilityChange = () => {
      if (!ready) return;
      if (document.hidden && !proctorBypass) {
        sounds.playAlarm();
        onDisqualify("Switched tab or minimized window.");
      }
    };

    // NOTE: window.blur removed — it was too aggressive and triggered on
    // any internal click (dropdowns, modals, canvas, etc.), causing false positives.
    // visibilitychange is sufficient for detecting real tab/app switching.

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(graceTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [quizState.antiCheatEnabled, onDisqualify]);

  // Progress circle geometry
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / totalTime) * circumference;

  return (
    <>
      {isWrongShake && <div className="glitch-red-overlay" />}
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "24px 20px 60px",
          minHeight: "calc(100vh - 80px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
        className={`fade-in ${isWrongShake ? "screen-shake" : ""}`}
      >
      {/* Top Banner Stats */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 24
      }}>
        {/* Round Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: "linear-gradient(135deg, #7928ca, #4338ca)",
            padding: "8px 16px",
            borderRadius: 12,
            fontWeight: 800,
            fontSize: "0.95rem",
            color: "#fff",
            boxShadow: "0 0 16px rgba(121, 40, 202, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <Shield size={16} color="#00f2fe" /> ROUND {currentRound} OF 3
          </div>

          <div style={{ color: "#94a3b8", fontSize: "0.95rem", fontWeight: 600 }}>
            Question {questionIndex + 1} of {roundQuestions.length || 5}
          </div>
        </div>

        {/* Score & Streak */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {team.streak > 1 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255, 183, 3, 0.15)",
              border: "1px solid #ffb703",
              color: "#ffb703",
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: "0.85rem",
              fontWeight: 800,
              animation: "pulseGlow 1s infinite alternate"
            }}>
              <Flame size={16} /> {team.streak}X STREAK!
            </div>
          )}

          <div style={{
            background: "rgba(18, 24, 46, 0.8)",
            border: "1px solid var(--border-glass)",
            padding: "6px 16px",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <Award size={18} color="#00f2fe" />
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
              {team.score || 0}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>PTS</span>
          </div>

          {/* Confirm to Logout Button */}
          <button
            onClick={() => {
              sounds.playSelect();
              setShowLogoutConfirm(true);
            }}
            className="nav-btn"
            style={{
              padding: "6px 12px",
              fontSize: "0.8rem",
              borderColor: "rgba(239, 71, 111, 0.35)",
              color: "#fca5a5",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
            title="Log out and return to Team Arena Gate"
          >
            <LogOut size={14} color="#ef476f" />
            <span>Exit Team</span>
          </button>
        </div>
      </div>

      {/* Main Question Arena Card */}
      {quizState.status === "ROUND_LEADERBOARD" || quizState.status === "FINAL_PODIUM" ? (
        /* Round Leaderboard Glance for Participants (Controlled by Host) */
        <div className="fade-in" style={{ margin: "auto 0" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid #f59e0b",
              color: "#fbbf24",
              padding: "6px 16px",
              borderRadius: 20,
              fontSize: "0.85rem",
              fontWeight: 800,
              textTransform: "uppercase",
              marginBottom: 12
            }}>
              <Trophy size={16} /> {quizState.status === "FINAL_PODIUM" ? "TOURNAMENT FINALE" : `ROUND ${currentRound} COMPLETED`}
            </div>
            <h2 style={{ fontSize: "2.3rem", fontWeight: 900, color: "#fff" }}>
              Official Round Standings
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
              Host is displaying the scoreboard. Review your ranking before the next round!
            </p>
          </div>

          {/* Personal Team Rank Spotlight Card */}
          <div className="glass-panel" style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))",
            border: "2px solid #818cf8",
            padding: "20px 28px",
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 26,
            boxShadow: "0 0 35px rgba(129, 140, 248, 0.35)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: "linear-gradient(135deg, #00f2fe, #4facfe)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#070913",
                fontWeight: 900,
                fontSize: "1.4rem"
              }}>
                #{teamRank}
              </div>
              <div>
                <div style={{ color: "#a5b4fc", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>
                  Your Team Performance
                </div>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
                  {team.name}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                  {team.player1} &amp; {team.player2}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fde047" }}>
                {team.score || 0}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700 }}>TOTAL POINTS</div>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
            {top3.map((t, idx) => (
              <div
                key={t.id}
                className="glass-panel"
                style={{
                  padding: "16px 20px",
                  border: idx === 0 ? "2px solid #eab308" : "1px solid var(--border-glass)",
                  background: idx === 0 ? "rgba(234, 179, 8, 0.1)" : "rgba(18, 24, 46, 0.7)",
                  display: "flex",
                  alignItems: "center",
                  gap: 14
                }}
              >
                <div style={{ fontSize: "1.8rem" }}>
                  {idx === 0 ? "👑" : idx === 1 ? "🥈" : "🥉"}
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {t.player1} &amp; {t.player2}
                  </div>
                </div>
                <div style={{ fontWeight: 900, color: idx === 0 ? "#fde047" : "#cbd5e1", fontSize: "1.1rem" }}>
                  {t.score || 0}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.85rem", marginTop: 12 }}>
            Host will close the scoreboard and launch the next round shortly.
          </div>
        </div>
      ) : quizState.status === "LOBBY" ? (
        /* Lobby State */
        <div className="glass-panel" style={{ padding: "60px 40px", textAlign: "center", margin: "auto 0" }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #00f2fe, #4facfe)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            color: "#070913",
            boxShadow: "0 0 35px rgba(0, 242, 254, 0.5)"
          }}>
            <Clock size={40} />
          </div>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#fff", marginBottom: 12 }}>
            {currentRound > 1 ? `Round ${currentRound - 1} Complete!` : `Welcome, Team ${team.name}!`}
          </h2>
          <p style={{ color: "#cbd5e1", fontSize: "1.15rem", maxWidth: 540, margin: "0 auto 28px" }}>
            {currentRound > 1
              ? `Stand by for Round ${currentRound}! Your team currently has ${team.score || 0} PTS. The Host will start Question 1 shortly.`
              : `The quiz host will initiate Round 1 shortly. Stay locked in this window to maintain anti-cheat integrity.`}
          </p>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--border-glass)",
            padding: "12px 24px",
            borderRadius: 16
          }}>
            <span style={{ color: "#a5b4fc" }}>Teammates:</span>
            <strong style={{ color: "#fff" }}>{team.player1} &amp; {team.player2}</strong>
          </div>
        </div>
      ) : (
        /* Active or Revealed Question Stage */
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, justifyContent: "center" }}>
          {/* Question Box with Circular Timer */}
          <div className="glass-panel" style={{ padding: "34px 38px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  color: "var(--accent-cyan)",
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10
                }}>
                  Worth {currentQuestion?.points || 1000} Points + Speed Bonus
                </div>
                <h2 style={{
                  fontSize: "1.85rem",
                  lineHeight: 1.35,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: currentQuestion?.image ? 16 : 0
                }}>
                  {currentQuestion?.question}
                </h2>

                {/* Question Image (if attached) */}
                {currentQuestion?.image && (
                  <div style={{ textAlign: "center", margin: "16px 0 20px" }}>
                    <img
                      src={currentQuestion.image}
                      alt="Question Asset"
                      style={{
                        maxHeight: 280,
                        maxWidth: "100%",
                        borderRadius: 14,
                        border: "1px solid var(--border-glass)",
                        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
                        objectFit: "contain"
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Countdown Circular Timer */}
              {quizState.status === "QUESTION_ACTIVE" && (
                <div className="timer-container" style={{ flexShrink: 0 }}>
                  <svg className="timer-svg" viewBox="0 0 80 80">
                    <circle className="timer-circle-bg" cx="40" cy="40" r={radius} />
                    <circle
                      className="timer-circle-progress"
                      cx="40"
                      cy="40"
                      r={radius}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      style={{
                        stroke: timeLeft <= 5 ? "#ef476f" : timeLeft <= 10 ? "#ffb703" : "#00f2fe"
                      }}
                    />
                  </svg>
                  <span
                    className="timer-text"
                    style={{ color: timeLeft <= 5 ? "#ef476f" : "#fff" }}
                  >
                    {timeLeft}
                  </span>
                </div>
              )}
            </div>

            {/* Answer feedback status banner */}
            {(hasSubmitted || savedAnswer) && quizState.status === "QUESTION_ACTIVE" && (
              <div style={{
                marginTop: 20,
                padding: "10px 16px",
                background: "rgba(99, 102, 241, 0.2)",
                border: "1px solid #818cf8",
                borderRadius: 10,
                color: "#c7d2fe",
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}>
                <Check size={18} color="#00f2fe" />
                <span>Response submitted (Option {userOption})! Waiting for countdown to finish...</span>
              </div>
            )}
          </div>

          {/* 4 Interactive Option Cards */}
          <div className="options-grid">
            {["A", "B", "C", "D"].map((key) => {
              const optionText = currentQuestion?.options?.[key];
              const isSelected = userOption === key;
              const isKeyCorrect = correctOption === key;
              const isRevealed = quizState.status === "QUESTION_REVEALED";

              let cardClass = `option-card opt-${key}`;
              if (isSelected) cardClass += " selected";
              if (isLocked || isRevealed) cardClass += " locked";
              if (isRevealed) {
                if (isKeyCorrect) cardClass += " is-correct-reveal";
                else cardClass += " is-wrong-reveal";
              }

              return (
                <div
                  key={key}
                  className={cardClass}
                  onClick={() => handleSelectOption(key)}
                >
                  <div className={`option-badge badge-${key}`}>{key}</div>
                  <div className="option-text" style={{ flex: 1 }}>{optionText}</div>
                  {isRevealed && isKeyCorrect && (
                    <div style={{
                      background: "#10b981",
                      borderRadius: "50%",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff"
                    }}>
                      <Check size={18} />
                    </div>
                  )}
                  {isRevealed && isSelected && !isKeyCorrect && (
                    <div style={{
                      background: "#ef476f",
                      borderRadius: "50%",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff"
                    }}>
                      <X size={18} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dynamic Result Announcement Banner on Reveal */}
          {quizState.status === "QUESTION_REVEALED" && (
            isAnswerCorrect ? (
              <div className="glass-panel fade-in" style={{
                background: "rgba(16, 185, 129, 0.2)",
                border: "2px solid #10b981",
                padding: "18px 24px",
                borderRadius: 16,
                boxShadow: "0 0 35px rgba(16, 185, 129, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    boxShadow: "0 0 20px #10b981"
                  }}>
                    <Check size={28} />
                  </div>
                  <div>
                    <div style={{ color: "#10b981", fontWeight: 900, fontSize: "1.2rem", letterSpacing: "0.04em" }}>
                      CORRECT! EXCELLENT JOB!
                    </div>
                    <div style={{ color: "#a7f3d0", fontSize: "0.9rem" }}>
                      Speed bonus awarded! Streak multiplier active!
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", color: "#34d399", fontWeight: 900, fontSize: "1.3rem" }}>
                  +{savedAnswer?.pointsEarned || submissionResult?.pointsEarned || currentQuestion.points || 1000} PTS
                </div>
              </div>
            ) : (
              <div className="glass-panel fade-in" style={{
                background: "rgba(239, 71, 111, 0.2)",
                border: "2px solid #ef476f",
                padding: "18px 24px",
                borderRadius: 16,
                boxShadow: "0 0 40px rgba(239, 71, 111, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#ef476f",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    boxShadow: "0 0 25px #ef476f"
                  }}>
                    <X size={28} />
                  </div>
                  <div>
                    <div style={{ color: "#ef476f", fontWeight: 900, fontSize: "1.25rem", letterSpacing: "0.04em" }}>
                      {userOption ? "INCORRECT ANSWER!" : "TIME EXPIRED / NO ANSWER!"}
                    </div>
                    <div style={{ color: "#fca5a5", fontSize: "0.95rem" }}>
                      {userOption ? "Streak broken! " : ""}Correct answer is <strong style={{ color: "#10b981", textDecoration: "underline" }}>Option {correctOption}: {currentQuestion?.options?.[correctOption]}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", color: "#fca5a5", fontWeight: 800, fontSize: "1.1rem" }}>
                  +0 PTS
                </div>
              </div>
            )
          )}

          {/* Revealed Fun Fact & Point Breakdown */}
          {quizState.status === "QUESTION_REVEALED" && (
            <div className="glass-panel fade-in" style={{
              padding: "20px 24px",
              background: "rgba(16, 185, 129, 0.08)",
              borderColor: "rgba(16, 185, 129, 0.3)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#10b981", fontWeight: 700, marginBottom: 6 }}>
                <HelpCircle size={20} />
                <span>Fun Fact &amp; Trivia:</span>
              </div>
              <p style={{ color: "#e2e8f0", fontSize: "1rem", lineHeight: 1.5 }}>
                {currentQuestion?.funFact || "The correct answer is revealed on the scoreboard!"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer Security Notice */}
      <div style={{
        textAlign: "center",
        color: quizState.antiCheatEnabled ? "#475569" : "#eab308",
        fontSize: "0.8rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6
      }}>
        <Shield size={14} />
        {quizState.antiCheatEnabled ? (
          "Anti-Cheat Fullscreen Sentinel Active • Pressing Esc or switching tabs terminates game."
        ) : (
          <span><strong>Testing Mode:</strong> Anti-Cheat is DISABLED by Host. You can freely switch tabs on this laptop!</span>
        )}
      </div>

      {/* Confirm to Logout Modal Dialog */}
      {showLogoutConfirm && (
        <div
          className="disqualification-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10, 14, 30, 0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20
          }}
        >
          <div className="glass-panel" style={{
            maxWidth: 440,
            width: "100%",
            padding: "32px 28px",
            textAlign: "center",
            border: "1px solid rgba(239, 71, 111, 0.4)",
            boxShadow: "0 0 50px rgba(239, 71, 111, 0.25)"
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(239, 71, 111, 0.15)",
              border: "1px solid #ef476f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#ef476f"
            }}>
              <LogOut size={26} />
            </div>

            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              Exit Player Arena?
            </h3>

            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to log out from team <strong style={{ color: "#00f2fe" }}>{team.name}</strong>?
              <br />
              <span style={{ fontSize: "0.82rem", color: "#cbd5e1", marginTop: 8, display: "inline-block" }}>
                Your score (<strong>{team.score || 0} PTS</strong>) and responses remain safely recorded. You can log back in anytime with your 6-digit PIN: <strong style={{ color: "#eab308" }}>{team.pin}</strong>
              </span>
            </p>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="nav-btn"
                style={{ padding: "10px 20px", fontSize: "0.9rem" }}
              >
                Cancel / Stay
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  if (onLogout) onLogout();
                }}
                className="btn-danger"
                style={{ padding: "10px 22px", fontSize: "0.9rem" }}
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
