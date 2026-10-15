import React, { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { Trophy, Medal, Award, Flame, Users, CheckCircle, Shield } from "lucide-react";
import { sounds } from "../utils/soundEffects";

export default function ProjectorLeaderboard({ quizState, teams, questions }) {
  const teamsList = useMemo(() => Object.values(teams || {}), [teams]);

  // Sort teams descending by score
  const sortedTeams = useMemo(() => {
    return [...teamsList].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [teamsList]);

  const top3 = sortedTeams.slice(0, 3);
  const restTop = sortedTeams.slice(3, 12);

  const currentRound = quizState.currentRound || 1;
  const questionIndex = quizState.questionIndex || 0;
  const roundQuestions = questions.filter((q) => q.round === currentRound);
  const currentQ = roundQuestions[questionIndex] || questions[0];
  const currentQId = currentQ?.id || "r1_q1";

  // Answer distribution counts
  const answerStats = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0, total: 0 };
    teamsList.forEach((t) => {
      const ans = t.answers && t.answers[currentQId];
      if (ans && ans.selectedOption) {
        counts[ans.selectedOption] = (counts[ans.selectedOption] || 0) + 1;
        counts.total++;
      }
    });
    return counts;
  }, [teamsList, currentQId]);

  // Celebration effects for Final Podium
  useEffect(() => {
    if (quizState.status === "FINAL_PODIUM") {
      sounds.playFanfare();
      const duration = 6 * 1000;
      const animationEnd = Date.now() + duration;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
      }, 350);

      return () => clearInterval(interval);
    }
  }, [quizState.status]);

  return (
    <div style={{
      maxWidth: 1280,
      margin: "0 auto",
      padding: "24px 24px 60px"
    }} className="fade-in">
      {/* Stadium Top Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border-glass)",
        paddingBottom: 20,
        marginBottom: 30
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            background: "linear-gradient(135deg, #f72585, #7209b7)",
            padding: "10px 18px",
            borderRadius: 14,
            fontWeight: 900,
            fontSize: "1.1rem",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 0 20px rgba(247, 37, 133, 0.4)"
          }}>
            <Trophy size={20} color="#ffd166" /> FUNQUIZ ARENA STADIUM
          </div>

          <div style={{ color: "#a5b4fc", fontSize: "1.05rem", fontWeight: 700 }}>
            ROUND {currentRound} OF 3 • QUESTION {questionIndex + 1}
          </div>
        </div>

        {/* Live response progress pill */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(18, 24, 46, 0.8)",
          border: "1px solid var(--border-glass)",
          padding: "8px 20px",
          borderRadius: 30
        }}>
          <Users size={18} color="#00f2fe" />
          <span style={{ color: "#fff", fontWeight: 700 }}>
            {answerStats.total} / {teamsList.length} Teams Answered
          </span>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#06d6a0",
            boxShadow: "0 0 10px #06d6a0"
          }} />
        </div>
      </div>

      {/* VIEW 1: ACTIVE QUESTION & REAL-TIME VOTING DISTRIBUTION */}
      {(quizState.status === "QUESTION_ACTIVE" || quizState.status === "QUESTION_REVEALED") && (
        <div style={{ marginBottom: 40 }}>
          {/* Question Banner */}
          <div className="glass-panel" style={{ padding: "36px 40px", marginBottom: 24 }}>
            <div style={{ color: "var(--accent-cyan)", fontSize: "0.9rem", fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>
              Live Arena Question • {currentQ?.points || 1000} Points
            </div>
            <h1 style={{ fontSize: "2.3rem", lineHeight: 1.3, color: "#fff", fontWeight: 800 }}>
              {currentQ?.question}
            </h1>
            {currentQ?.image && (
              <div style={{ textAlign: "center", marginTop: 22 }}>
                <img
                  src={currentQ.image}
                  alt="Question Asset"
                  style={{
                    maxHeight: 340,
                    maxWidth: "100%",
                    borderRadius: 16,
                    border: "1px solid var(--border-glass)",
                    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
                    objectFit: "contain"
                  }}
                />
              </div>
            )}
          </div>

          {/* 4 Options Grid with Live Distribution */}
          <div className="options-grid" style={{ marginBottom: 24 }}>
            {["A", "B", "C", "D"].map((key) => {
              const text = currentQ?.options?.[key];
              const isCorrect = currentQ?.correct === key;
              const count = answerStats[key] || 0;
              const pct = answerStats.total > 0 ? Math.round((count / answerStats.total) * 100) : 0;
              const isRevealed = quizState.status === "QUESTION_REVEALED";

              let cardClass = `option-card opt-${key}`;
              if (isRevealed) {
                if (isCorrect) cardClass += " is-correct-reveal";
                else cardClass += " is-wrong-reveal";
              }

              return (
                <div key={key} className={cardClass} style={{ padding: "26px", flexDirection: "column", alignItems: "stretch" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div className={`option-badge badge-${key}`}>{key}</div>
                    <div className="option-text" style={{ fontSize: "1.25rem", fontWeight: 600 }}>{text}</div>
                    {isRevealed && isCorrect && (
                      <span style={{ marginLeft: "auto", background: "#10b981", padding: "4px 12px", borderRadius: 12, fontWeight: 800, fontSize: "0.85rem", color: "#fff" }}>
                        CORRECT
                      </span>
                    )}
                  </div>

                  {/* Distribution Bar */}
                  {isRevealed && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: 6 }}>
                        <span>Teams Picked: {count}</span>
                        <strong style={{ color: "#fff" }}>{pct}%</strong>
                      </div>
                      <div style={{ height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: isCorrect ? "#10b981" : "rgba(255,255,255,0.4)",
                          transition: "width 0.8s ease"
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: LEADERBOARD PODIUM (For ROUND_LEADERBOARD and FINAL_PODIUM) */}
      {(quizState.status === "ROUND_LEADERBOARD" || quizState.status === "FINAL_PODIUM" || quizState.status === "LOBBY") && (
        <div>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{ fontSize: "2.6rem", fontWeight: 900, color: "#fff" }}>
              {quizState.status === "FINAL_PODIUM" ? "👑 TOURNAMENT CHAMPIONS" : `🏆 ROUND ${currentRound} LEADERBOARD`}
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>
              Live Scores &amp; Standings Across All Paired Teams
            </p>
          </div>

          {/* Top 3 3D Podium */}
          {top3.length > 0 && (
            <div className="podium-wrapper">
              {/* 2nd Place */}
              {top3[1] && (
                <div className="podium-pillar podium-2nd">
                  <div style={{ textAlign: "center", padding: "16px 12px 0" }}>
                    <div style={{ fontSize: "2rem" }}>🥈</div>
                    <div style={{ fontWeight: 800, color: "#fff", fontSize: "1.1rem" }}>
                      {top3[1].name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                      {top3[1].player1} &amp; {top3[1].player2}
                    </div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#cbd5e1", marginTop: 8 }}>
                      {top3[1].score || 0} <span style={{ fontSize: "0.7rem" }}>PTS</span>
                    </div>
                  </div>
                  <div className="podium-rank-badge" style={{ color: "#cbd5e1" }}>2</div>
                </div>
              )}

              {/* 1st Place */}
              {top3[0] && (
                <div className="podium-pillar podium-1st">
                  <div style={{ textAlign: "center", padding: "16px 12px 0" }}>
                    <div style={{ fontSize: "2.5rem" }}>👑</div>
                    <div style={{ fontWeight: 900, color: "#fff", fontSize: "1.25rem" }}>
                      {top3[0].name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#fef08a" }}>
                      {top3[0].player1} &amp; {top3[0].player2}
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fde047", marginTop: 8 }}>
                      {top3[0].score || 0} <span style={{ fontSize: "0.75rem" }}>PTS</span>
                    </div>
                  </div>
                  <div className="podium-rank-badge" style={{ color: "#fde047" }}>1</div>
                </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <div className="podium-pillar podium-3rd">
                  <div style={{ textAlign: "center", padding: "16px 12px 0" }}>
                    <div style={{ fontSize: "1.8rem" }}>🥉</div>
                    <div style={{ fontWeight: 800, color: "#fff", fontSize: "1.05rem" }}>
                      {top3[2].name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                      {top3[2].player1} &amp; {top3[2].player2}
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fdba74", marginTop: 8 }}>
                      {top3[2].score || 0} <span style={{ fontSize: "0.7rem" }}>PTS</span>
                    </div>
                  </div>
                  <div className="podium-rank-badge" style={{ color: "#fdba74" }}>3</div>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Table (Ranks 4 - 12) */}
          <div className="glass-panel" style={{ padding: "24px 30px", marginTop: 24 }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 16 }}>
              Top Contenders Leaderboard
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
              {restTop.map((t, idx) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: 14
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: "rgba(99, 102, 241, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      color: "#a5b4fc"
                    }}>
                      #{idx + 4}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{t.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{t.player1} &amp; {t.player2}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#00f2fe" }}>
                      {t.score || 0}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>PTS</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
