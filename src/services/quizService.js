import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update, get } from "firebase/database";
import { DEFAULT_QUESTIONS } from "../data/defaultQuestions";
import { SAMPLE_TEAMS } from "../data/sampleTeams";

// Default Initial Quiz State
export const INITIAL_STATE = {
  status: "LOBBY", // LOBBY, QUESTION_ACTIVE, QUESTION_REVEALED, ROUND_LEADERBOARD, FINAL_PODIUM
  currentRound: 1,
  questionIndex: 0,
  activeQuestionId: "r1_q1",
  questionStartTime: null,
  timeLimit: 20,
  broadcastMsg: "",
  antiCheatEnabled: false // Disabled for easy local testing; Host can enable anytime!
};

class QuizService {
  constructor() {
    this.channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("funquiz_sync_channel") : null;
    this.firebaseApp = null;
    this.db = null;
    this.isFirebaseReady = false;

    this.stateListeners = new Set();
    this.teamsListeners = new Set();
    this.questionsListeners = new Set();

    // In-memory cache
    this.currentState = this.loadLocalState();
    this.currentTeams = this.loadLocalTeams();
    this.currentQuestions = this.loadLocalQuestions();

    this.initFirebase();
    this.setupLocalBroadcast();
  }

  loadLocalState() {
    try {
      const saved = localStorage.getItem("funquiz_state");
      return saved ? { ...INITIAL_STATE, ...JSON.parse(saved) } : { ...INITIAL_STATE };
    } catch {
      return { ...INITIAL_STATE };
    }
  }

  loadLocalTeams() {
    try {
      const saved = localStorage.getItem("funquiz_teams");
      if (saved) return JSON.parse(saved);
      // Initialize with sample teams map
      const map = {};
      SAMPLE_TEAMS.forEach(t => {
        map[t.id] = { ...t, answers: {}, disqualified: false };
      });
      return map;
    } catch {
      return {};
    }
  }

  loadLocalQuestions() {
    try {
      const saved = localStorage.getItem("funquiz_questions");
      return saved ? JSON.parse(saved) : [...DEFAULT_QUESTIONS];
    } catch {
      return [...DEFAULT_QUESTIONS];
    }
  }

  initFirebase() {
    let cfg = null;
    const configStr = localStorage.getItem("funquiz_firebase_config");
    if (configStr) {
      try {
        cfg = JSON.parse(configStr);
      } catch (err) {
        console.warn("Failed to parse stored Firebase config:", err);
      }
    }

    // Check Vite environment variables (Vercel deployment support)
    if (!cfg || !cfg.apiKey) {
      const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const envDb = import.meta.env.VITE_FIREBASE_DATABASE_URL || (envProjectId ? `https://${envProjectId}-default-rtdb.firebaseio.com` : "");
      if (envKey) {
        cfg = {
          apiKey: envKey,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
          databaseURL: envDb,
          projectId: envProjectId || "",
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.firebasestorage.app`,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
          appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
        };
      }
    }

    if (cfg && !cfg.databaseURL && cfg.projectId) {
      cfg.databaseURL = `https://${cfg.projectId}-default-rtdb.firebaseio.com`;
    }

    if (!cfg || !cfg.apiKey || !cfg.databaseURL) return;

    try {
      if (cfg.apiKey && cfg.databaseURL) {
        this.firebaseApp = getApps().length === 0 ? initializeApp(cfg) : getApp();
        this.db = getDatabase(this.firebaseApp);
        this.isFirebaseReady = true;

        // Listen for Realtime DB state changes
        const stateRef = ref(this.db, "quizState");
        onValue(stateRef, snapshot => {
          const val = snapshot.val();
          if (val) {
            this.currentState = val;
            this.notifyStateListeners();
          }
        });

        // Listen for Realtime DB teams changes
        const teamsRef = ref(this.db, "teams");
        onValue(teamsRef, snapshot => {
          const val = snapshot.val();
          if (val) {
            this.currentTeams = val;
            this.notifyTeamsListeners();
          }
        });

        // Listen for Realtime DB questions changes
        const qRef = ref(this.db, "questions");
        onValue(qRef, snapshot => {
          const val = snapshot.val();
          if (val) {
            this.currentQuestions = Array.isArray(val) ? val : Object.values(val);
            this.notifyQuestionsListeners();
          }
        });
      }
    } catch (err) {
      console.warn("Failed to initialize Firebase config:", err);
      this.isFirebaseReady = false;
    }
  }

  // Push all local data (state, teams, questions) to Firebase Realtime Database
  async pushAllToFirebase() {
    if (!this.isFirebaseReady || !this.db) {
      console.warn("Firebase not ready for sync");
      return false;
    }
    try {
      await set(ref(this.db, "quizState"), this.currentState);
      await set(ref(this.db, "teams"), this.currentTeams);
      await set(ref(this.db, "questions"), this.currentQuestions);
      return true;
    } catch (e) {
      console.error("Firebase push all error:", e);
      return false;
    }
  }

  setupLocalBroadcast() {
    if (!this.channel) return;
    this.channel.onmessage = event => {
      const { type, payload } = event.data || {};
      if (type === "STATE_UPDATED") {
        this.currentState = payload;
        this.notifyStateListeners();
      } else if (type === "TEAMS_UPDATED") {
        this.currentTeams = payload;
        this.notifyTeamsListeners();
      } else if (type === "QUESTIONS_UPDATED") {
        this.currentQuestions = payload;
        this.notifyQuestionsListeners();
      }
    };
  }

  saveFirebaseConfig(cfg) {
    try {
      localStorage.setItem("funquiz_firebase_config", JSON.stringify(cfg));
      this.initFirebase();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  getFirebaseConfig() {
    try {
      return JSON.parse(localStorage.getItem("funquiz_firebase_config") || "{}");
    } catch {
      return {};
    }
  }

  // State Subscriptions
  onStateChange(cb) {
    this.stateListeners.add(cb);
    cb(this.currentState);
    return () => this.stateListeners.delete(cb);
  }

  onTeamsChange(cb) {
    this.teamsListeners.add(cb);
    cb(this.currentTeams);
    return () => this.teamsListeners.delete(cb);
  }

  onQuestionsChange(cb) {
    this.questionsListeners.add(cb);
    cb(this.currentQuestions);
    return () => this.questionsListeners.delete(cb);
  }

  notifyStateListeners() {
    this.stateListeners.forEach(cb => cb(this.currentState));
  }

  notifyTeamsListeners() {
    this.teamsListeners.forEach(cb => cb(this.currentTeams));
  }

  notifyQuestionsListeners() {
    this.questionsListeners.forEach(cb => cb(this.currentQuestions));
  }

  // Update State (Admin triggered)
  async updateQuizState(partial) {
    const newState = { ...this.currentState, ...partial };
    this.currentState = newState;
    localStorage.setItem("funquiz_state", JSON.stringify(newState));
    this.notifyStateListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "STATE_UPDATED", payload: newState });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await set(ref(this.db, "quizState"), newState);
      } catch (e) {
        console.error("Firebase update state error:", e);
      }
    }
  }

  // Submit Answer for a Team
  async submitAnswer(teamId, questionId, selectedOption, timeRemaining, totalTime) {
    if (!this.currentTeams[teamId]) return;

    const team = { ...this.currentTeams[teamId] };
    if (team.disqualified) return;

    const currentQ = this.currentQuestions.find(q => q.id === questionId) || this.currentQuestions[0];
    const isCorrect = selectedOption.toUpperCase() === currentQ.correct.toUpperCase();

    // Scoring math: Base points + speed bonus multiplier
    let pointsEarned = 0;
    let newStreak = team.streak || 0;

    if (isCorrect) {
      newStreak += 1;
      const basePoints = currentQ.points || 1000;
      // Speed factor: 0.5 to 1.0 based on remaining time
      const speedFactor = totalTime > 0 ? (timeRemaining / totalTime) : 0.5;
      const speedBonus = Math.round(basePoints * 0.5 * speedFactor);
      const streakMultiplier = newStreak >= 3 ? 1.5 : newStreak === 2 ? 1.2 : 1.0;

      pointsEarned = Math.round((basePoints + speedBonus) * streakMultiplier);
    } else {
      newStreak = 0;
    }

    const updatedAnswers = {
      ...(team.answers || {}),
      [questionId]: {
        selectedOption,
        isCorrect,
        pointsEarned,
        timeTaken: Math.max(0, totalTime - timeRemaining),
        answeredAt: Date.now()
      }
    };

    const newScore = (team.score || 0) + pointsEarned;

    const updatedTeam = {
      ...team,
      score: newScore,
      streak: newStreak,
      answers: updatedAnswers,
      status: "ANSWERED"
    };

    const newTeams = {
      ...this.currentTeams,
      [teamId]: updatedTeam
    };

    this.currentTeams = newTeams;
    localStorage.setItem("funquiz_teams", JSON.stringify(newTeams));
    this.notifyTeamsListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "TEAMS_UPDATED", payload: newTeams });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await update(ref(this.db, `teams/${teamId}`), updatedTeam);
      } catch (e) {
        console.error("Firebase update team error:", e);
      }
    }

    return {
      isCorrect,
      pointsEarned,
      newScore,
      streak: newStreak
    };
  }

  // Disqualification enforcement (Anti-cheat triggered)
  async markDisqualified(teamId, reason = "Exited Fullscreen / Anti-Cheat Violation") {
    if (!this.currentTeams[teamId]) return;

    const team = {
      ...this.currentTeams[teamId],
      disqualified: true,
      disqualifiedReason: reason,
      disqualifiedAt: Date.now(),
      status: "DISQUALIFIED"
    };

    const newTeams = {
      ...this.currentTeams,
      [teamId]: team
    };

    this.currentTeams = newTeams;
    localStorage.setItem("funquiz_teams", JSON.stringify(newTeams));
    this.notifyTeamsListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "TEAMS_UPDATED", payload: newTeams });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await update(ref(this.db, `teams/${teamId}`), team);
      } catch (e) {
        console.error("Firebase disqualify error:", e);
      }
    }
  }

  // Admin reinstate team
  async reinstateTeam(teamId) {
    if (!this.currentTeams[teamId]) return;

    const team = {
      ...this.currentTeams[teamId],
      disqualified: false,
      disqualifiedReason: null,
      status: "READY"
    };

    const newTeams = {
      ...this.currentTeams,
      [teamId]: team
    };

    this.currentTeams = newTeams;
    localStorage.setItem("funquiz_teams", JSON.stringify(newTeams));
    this.notifyTeamsListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "TEAMS_UPDATED", payload: newTeams });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await update(ref(this.db, `teams/${teamId}`), team);
      } catch (e) {
        console.error("Firebase reinstate error:", e);
      }
    }
  }

  // Add or Update Team Manually
  async saveTeam(teamData) {
    const teamId = teamData.id || `TEAM_${Date.now()}`;
    const existing = this.currentTeams[teamId] || {};

    const updatedTeam = {
      id: teamId,
      name: teamData.name?.trim() || "Gladiator Pair",
      pin: String(teamData.pin || "").trim(),
      player1: teamData.player1?.trim() || "Player 1",
      player2: teamData.player2?.trim() || "",
      score: typeof teamData.score === "number" ? teamData.score : (existing.score || 0),
      streak: typeof teamData.streak === "number" ? teamData.streak : (existing.streak || 0),
      status: teamData.status || existing.status || "READY",
      disqualified: Boolean(existing.disqualified),
      disqualifiedReason: existing.disqualifiedReason || null,
      answers: existing.answers || {}
    };

    const newTeams = {
      ...this.currentTeams,
      [teamId]: updatedTeam
    };

    this.currentTeams = newTeams;
    localStorage.setItem("funquiz_teams", JSON.stringify(newTeams));
    this.notifyTeamsListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "TEAMS_UPDATED", payload: newTeams });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await set(ref(this.db, `teams/${teamId}`), updatedTeam);
      } catch (e) {
        console.error("Firebase save team error:", e);
      }
    }

    return updatedTeam;
  }

  // Delete Team Manually
  async deleteTeam(teamId) {
    if (!this.currentTeams[teamId]) return;

    const newTeams = { ...this.currentTeams };
    delete newTeams[teamId];

    this.currentTeams = newTeams;
    localStorage.setItem("funquiz_teams", JSON.stringify(newTeams));
    this.notifyTeamsListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "TEAMS_UPDATED", payload: newTeams });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await set(ref(this.db, `teams/${teamId}`), null);
      } catch (e) {
        console.error("Firebase delete team error:", e);
      }
    }
  }

  // Clear all teams (Blank slate for manual entry)
  async clearAllTeams() {
    this.currentTeams = {};
    localStorage.setItem("funquiz_teams", JSON.stringify({}));
    this.notifyTeamsListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "TEAMS_UPDATED", payload: {} });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await set(ref(this.db, "teams"), {});
      } catch (e) {
        console.error("Firebase clear teams error:", e);
      }
    }
  }

  // Import Teams & Questions from Google Sheets JSON
  async importBulkData({ teams, questions }) {
    if (teams && teams.length) {
      const map = {};
      teams.forEach(t => {
        map[t.id] = {
          ...t,
          score: 0,
          streak: 0,
          status: "READY",
          disqualified: false,
          answers: {}
        };
      });
      this.currentTeams = map;
      localStorage.setItem("funquiz_teams", JSON.stringify(map));
      this.notifyTeamsListeners();
      if (this.channel) this.channel.postMessage({ type: "TEAMS_UPDATED", payload: map });
      if (this.isFirebaseReady && this.db) {
        await set(ref(this.db, "teams"), map);
      }
    }

    if (questions && questions.length) {
      const qList = questions.map((q, idx) => ({
        ...q,
        id: q.id || `r${q.round || 1}_q${q.number || (idx + 1)}`
      }));
      this.currentQuestions = qList;
      localStorage.setItem("funquiz_questions", JSON.stringify(qList));
      this.notifyQuestionsListeners();
      if (this.channel) this.channel.postMessage({ type: "QUESTIONS_UPDATED", payload: qList });
      if (this.isFirebaseReady && this.db) {
        await set(ref(this.db, "questions"), qList);
      }
    }
  }

  // Add or Update a Question directly from Host Console (Requirement 3)
  async saveQuestion(questionData) {
    const list = [...this.currentQuestions];
    const qId = questionData.id || `r${questionData.round || 1}_q${Date.now()}`;

    const formattedQ = {
      id: qId,
      round: Number(questionData.round) || 1,
      number: Number(questionData.number) || (list.filter(q => q.round === (Number(questionData.round) || 1)).length + 1),
      question: questionData.question?.trim() || "Untitled Question",
      image: questionData.image || null,
      options: {
        A: questionData.options?.A?.trim() || "Option A",
        B: questionData.options?.B?.trim() || "Option B",
        C: questionData.options?.C?.trim() || "Option C",
        D: questionData.options?.D?.trim() || "Option D"
      },
      correct: String(questionData.correct || "A").trim().toUpperCase(),
      points: Number(questionData.points) || 1000,
      timeLimit: Number(questionData.timeLimit) || 20,
      funFact: questionData.funFact?.trim() || ""
    };

    const existingIdx = list.findIndex(q => q.id === qId);
    if (existingIdx >= 0) {
      list[existingIdx] = formattedQ;
    } else {
      list.push(formattedQ);
    }

    // Sort by round then question number
    list.sort((a, b) => (a.round - b.round) || (a.number - b.number));

    this.currentQuestions = list;
    localStorage.setItem("funquiz_questions", JSON.stringify(list));
    this.notifyQuestionsListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "QUESTIONS_UPDATED", payload: list });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await set(ref(this.db, "questions"), list);
      } catch (e) {
        console.error("Firebase save question error:", e);
      }
    }

    return formattedQ;
  }

  // Delete a Question
  async deleteQuestion(questionId) {
    const list = this.currentQuestions.filter(q => q.id !== questionId);
    this.currentQuestions = list;
    localStorage.setItem("funquiz_questions", JSON.stringify(list));
    this.notifyQuestionsListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "QUESTIONS_UPDATED", payload: list });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await set(ref(this.db, "questions"), list);
      } catch (e) {
        console.error("Firebase delete question error:", e);
      }
    }
  }

  // Reset Questions to Default Curated List
  async resetQuestionsToDefault() {
    this.currentQuestions = [...DEFAULT_QUESTIONS];
    localStorage.setItem("funquiz_questions", JSON.stringify(DEFAULT_QUESTIONS));
    this.notifyQuestionsListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "QUESTIONS_UPDATED", payload: DEFAULT_QUESTIONS });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await set(ref(this.db, "questions"), DEFAULT_QUESTIONS);
      } catch (e) {
        console.error("Firebase reset questions error:", e);
      }
    }
  }

  // Reset entire quiz session
  async resetQuiz() {
    const freshState = { ...INITIAL_STATE };
    this.currentState = freshState;
    localStorage.setItem("funquiz_state", JSON.stringify(freshState));
    this.notifyStateListeners();

    // Reset scores & streaks
    const resetTeams = {};
    Object.values(this.currentTeams).forEach(t => {
      resetTeams[t.id] = {
        ...t,
        score: 0,
        streak: 0,
        status: "READY",
        disqualified: false,
        disqualifiedReason: null,
        answers: {}
      };
    });
    this.currentTeams = resetTeams;
    localStorage.setItem("funquiz_teams", JSON.stringify(resetTeams));
    this.notifyTeamsListeners();

    if (this.channel) {
      this.channel.postMessage({ type: "STATE_UPDATED", payload: freshState });
      this.channel.postMessage({ type: "TEAMS_UPDATED", payload: resetTeams });
    }

    if (this.isFirebaseReady && this.db) {
      try {
        await set(ref(this.db, "quizState"), freshState);
        await set(ref(this.db, "teams"), resetTeams);
      } catch (e) {
        console.error("Firebase reset error:", e);
      }
    }
  }
}

export const quizService = new QuizService();
