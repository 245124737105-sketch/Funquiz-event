import React, { useState, useMemo } from "react";
import {
  Play,
  CheckCircle2,
  Trophy,
  SkipForward,
  RotateCcw,
  Users,
  ShieldAlert,
  ShieldCheck,
  Lock,
  UploadCloud,
  Check,
  Tv,
  ChevronDown,
  ChevronUp,
  Search,
  UserPlus,
  Edit3,
  Trash2,
  Copy,
  Download,
  Dices,
  Sparkles,
  Plus,
  X,
  Image as ImageIcon,
  LogOut,
  HelpCircle,
  FolderPlus,
  Eye,
  EyeOff
} from "lucide-react";
import { quizService } from "../services/quizService";
import { sounds } from "../utils/soundEffects";
import { generateFunTeamName, generate6DigitPin, getNextTeamId } from "../utils/teamGenerator";

export default function AdminDashboard({ quizState, teams, questions, onLockHost }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [importStatus, setImportStatus] = useState("");

  // Host Logout Confirmation (Requirement 2)
  const [showHostLogoutConfirm, setShowHostLogoutConfirm] = useState(false);

  // Question Management State (Requirement 3)
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionFilterRound, setQuestionFilterRound] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // inline delete confirm instead of window.confirm
  const [questionForm, setQuestionForm] = useState({
    round: 1,
    number: 1,
    question: "",
    image: null,
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correct: "A",
    points: 1000,
    timeLimit: 20,
    funFact: ""
  });
  const [questionFormError, setQuestionFormError] = useState("");

  // Attendance & Member Pairing State
  const [pairingTab, setPairingTab] = useState("direct"); // "direct" | "pool" | "roster"
  const [waitingPool, setWaitingPool] = useState(() => {
    try {
      const saved = localStorage.getItem("funquiz_waiting_pool");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newMemberName, setNewMemberName] = useState("");
  const [selectedPoolIndices, setSelectedPoolIndices] = useState([]);

  // Direct Pair State
  const [directPair, setDirectPair] = useState({
    member1: "",
    member2: ""
  });
  const [directPairError, setDirectPairError] = useState("");

  // Credentials Generated Modal State (Requirements 2 & 5)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState([]);
  const [copiedSlipId, setCopiedSlipId] = useState(null);

  // Edit Team Modal State
  const [editingTeam, setEditingTeam] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", pin: "", player1: "", player2: "" });
  const [editError, setEditError] = useState("");
  const [revealedPins, setRevealedPins] = useState({});

  const toggleRevealPin = (teamId) => {
    setRevealedPins(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const teamsList = useMemo(() => Object.values(teams || {}), [teams]);
  const totalTeams = teamsList.length;
  const totalPlayers = useMemo(
    () => teamsList.reduce((acc, t) => acc + (t.player1 ? 1 : 0) + (t.player2 ? 1 : 0), 0),
    [teamsList]
  );

  const currentRound = quizState.currentRound || 1;
  const questionIndex = quizState.questionIndex || 0;
  const roundQuestions = questions.filter((q) => q.round === currentRound);
  const currentQ = roundQuestions[questionIndex] || questions[0];
  const currentQId = currentQ?.id || "r1_q1";

  // Answered metrics
  const answeredCount = teamsList.filter((t) => t.answers && t.answers[currentQId]).length;
  const responsePct = totalTeams > 0 ? Math.round((answeredCount / totalTeams) * 100) : 0;
  const disqualifiedTeams = teamsList.filter((t) => t.disqualified);

  // Sorted teams for Host Live Scoreboard (Auto-updating)
  const sortedTeams = useMemo(() => {
    let list = [...teamsList].sort((a, b) => (b.score || 0) - (a.score || 0));
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.player1?.toLowerCase().includes(q) ||
          t.player2?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [teamsList, searchTerm]);

  // Status checks for linear stepper
  const isQuestionActive = quizState.status === "QUESTION_ACTIVE";
  const isQuestionRevealed = quizState.status === "QUESTION_REVEALED";
  const isLeaderboard = quizState.status === "ROUND_LEADERBOARD" || quizState.status === "FINAL_PODIUM";
  const isLobby = quizState.status === "LOBBY";

  // 1-2-3-4 STEP ACTIONS
  const handleStep1Launch = async () => {
    sounds.playRoundStart();
    await quizService.updateQuizState({
      status: "QUESTION_ACTIVE",
      activeQuestionId: currentQ.id,
      questionStartTime: Date.now(),
      timeLimit: currentQ.timeLimit || 20
    });
  };

  const handleStep2Reveal = async () => {
    sounds.playCorrect();
    await quizService.updateQuizState({
      status: "QUESTION_REVEALED"
    });
  };

  // STEP 3: Toggle Scoreboard Display / Close
  const handleToggleLeaderboard = async () => {
    if (isLeaderboard) {
      // Close Scoreboard & Enter Next Round Lobby
      sounds.playSelect();
      const nextRound = Math.min(3, currentRound + 1);
      const nextRoundQuestions = questions.filter((q) => q.round === nextRound);
      const firstQ = nextRoundQuestions[0] || questions[0];
      await quizService.updateQuizState({
        status: "LOBBY",
        currentRound: nextRound,
        questionIndex: 0,
        activeQuestionId: firstQ?.id || "r1_q1"
      });
    } else {
      // Display Round Scoreboard to everyone
      sounds.playFanfare();
      await quizService.updateQuizState({
        status: "ROUND_LEADERBOARD"
      });
    }
  };

  const handleStep4Next = async () => {
    sounds.playSelect();
    const nextIdx = questionIndex + 1;
    if (nextIdx < roundQuestions.length) {
      const nextQ = roundQuestions[nextIdx];
      await quizService.updateQuizState({
        status: "QUESTION_ACTIVE",
        questionIndex: nextIdx,
        activeQuestionId: nextQ.id,
        questionStartTime: Date.now(),
        timeLimit: nextQ.timeLimit || 20
      });
    } else {
      // Round completed -> Display Round Scoreboard
      handleToggleLeaderboard();
    }
  };

  const handleSwitchRound = async (roundNum) => {
    sounds.playSelect();
    const rQuestions = questions.filter((q) => q.round === roundNum);
    const firstQ = rQuestions[0] || questions[0];
    await quizService.updateQuizState({
      status: "LOBBY",
      currentRound: roundNum,
      questionIndex: 0,
      activeQuestionId: firstQ?.id || "r1_q1"
    });
  };

  const handleToggleAntiCheat = async () => {
    const nextVal = !quizState.antiCheatEnabled;
    sounds.playSelect();
    await quizService.updateQuizState({ antiCheatEnabled: nextVal });
  };

  const handleReinstate = async (teamId) => {
    sounds.playCorrect();
    await quizService.reinstateTeam(teamId);
  };

  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      await quizService.importBulkData(parsed);
      setImportStatus("✅ Successfully imported teams & questions!");
      sounds.playCorrect();
    } catch (err) {
      setImportStatus(`❌ Invalid JSON: ${err.message}`);
      sounds.playWrong();
    }
  };

  // Question Management Handlers (Requirement 3)
  const handleOpenAddQuestion = (targetRound = currentRound) => {
    sounds.playSelect();
    const roundQCount = questions.filter(q => q.round === targetRound).length;
    setEditingQuestionId(null);
    setQuestionForm({
      round: targetRound,
      number: roundQCount + 1,
      question: "",
      image: null,
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correct: "A",
      points: targetRound === 1 ? 1000 : targetRound === 2 ? 1200 : 1500,
      timeLimit: 20,
      funFact: ""
    });
    setQuestionFormError("");
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (q) => {
    sounds.playSelect();
    setEditingQuestionId(q.id);
    setQuestionForm({
      round: q.round || 1,
      number: q.number || 1,
      question: q.question || "",
      image: q.image || null,
      optionA: q.options?.A || "",
      optionB: q.options?.B || "",
      optionC: q.options?.C || "",
      optionD: q.options?.D || "",
      correct: q.correct || "A",
      points: q.points || 1000,
      timeLimit: q.timeLimit || 20,
      funFact: q.funFact || ""
    });
    setQuestionFormError("");
    setShowQuestionModal(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setQuestionForm(prev => ({ ...prev, image: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setQuestionFormError("");

    if (!questionForm.question.trim()) {
      setQuestionFormError("Question text is required.");
      sounds.playWrong();
      return;
    }
    if (!questionForm.optionA.trim() || !questionForm.optionB.trim()) {
      setQuestionFormError("At least Option A and Option B are required.");
      sounds.playWrong();
      return;
    }

    const payload = {
      id: editingQuestionId || `r${questionForm.round}_q${Date.now()}`,
      round: Number(questionForm.round),
      number: Number(questionForm.number),
      question: questionForm.question.trim(),
      image: questionForm.image,
      options: {
        A: questionForm.optionA.trim(),
        B: questionForm.optionB.trim(),
        C: questionForm.optionC.trim() || "-",
        D: questionForm.optionD.trim() || "-"
      },
      correct: questionForm.correct,
      points: Number(questionForm.points) || 1000,
      timeLimit: Number(questionForm.timeLimit) || 20,
      funFact: questionForm.funFact.trim()
    };

    await quizService.saveQuestion(payload);
    sounds.playCorrect();
    setShowQuestionModal(false);
  };

  // Inline delete — no window.confirm (browser suppresses dialogs when overlays are open)
  const handleDeleteQuestion = async (qId) => {
    sounds.playAlarm();
    await quizService.deleteQuestion(qId);
    setDeleteConfirmId(null);
  };

  const handleResetQuestions = async () => {
    sounds.playSelect();
    await quizService.resetQuestionsToDefault();
  };

  const handleJumpToQuestion = async (q) => {
    sounds.playSelect();
    const rQuestions = questions.filter(item => item.round === q.round);
    const idx = rQuestions.findIndex(item => item.id === q.id);
    await quizService.updateQuizState({
      currentRound: q.round,
      questionIndex: Math.max(0, idx),
      activeQuestionId: q.id,
      timeLimit: q.timeLimit || 20,
      status: "LOBBY"
    });
  };

  // Attendance Pool updater with localStorage persistence
  const updateWaitingPool = (newPool) => {
    setWaitingPool(newPool);
    localStorage.setItem("funquiz_waiting_pool", JSON.stringify(newPool));
  };

  // Add individual attendee to queue (Requirement 1)
  const handleAddMemberToPool = (e) => {
    if (e) e.preventDefault();
    const name = newMemberName.trim();
    if (!name) return;
    sounds.playSelect();
    const updated = [...waitingPool, name];
    updateWaitingPool(updated);
    setNewMemberName("");
  };

  // Remove attendee from queue
  const handleRemoveFromPool = (index) => {
    sounds.playSelect();
    const updated = waitingPool.filter((_, i) => i !== index);
    updateWaitingPool(updated);
    setSelectedPoolIndices((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
    );
  };

  // Toggle selection in pool
  const handleTogglePoolSelect = (index) => {
    sounds.playSelect();
    setSelectedPoolIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Auto-Pair ALL Waiting Members in Pool (Requirements 1, 2, 3, 5)
  const handleAutoPairPool = async () => {
    if (waitingPool.length < 2) {
      alert("At least 2 arrived members are needed in the pool to pair.");
      return;
    }

    sounds.playFanfare();
    const poolCopy = [...waitingPool];
    // Fisher-Yates shuffle
    for (let i = poolCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [poolCopy[i], poolCopy[j]] = [poolCopy[j], poolCopy[i]];
    }

    const created = [];
    const existingNames = teamsList.map((t) => t.name);

    for (let i = 0; i < poolCopy.length; i += 2) {
      const p1 = poolCopy[i];
      const p2 = poolCopy[i + 1] || "";
      const teamId = getNextTeamId({
        ...teams,
        ...created.reduce((acc, t) => ({ ...acc, [t.id]: t }), {})
      });
      // Requirement 2: right after pairing up we can generate a new unique team name
      const teamName = generateFunTeamName([...existingNames, ...created.map((t) => t.name)]);
      const pin = generate6DigitPin();

      const teamData = {
        id: teamId,
        name: teamName,
        pin: pin,
        player1: p1,
        player2: p2,
        score: 0,
        streak: 0,
        status: "READY"
      };

      // Requirement 3: right after adding the team update it in the player arena module
      await quizService.saveTeam(teamData);
      created.push(teamData);
    }

    // Clear pool
    updateWaitingPool([]);
    setSelectedPoolIndices([]);

    // Requirement 5: the admin gets all the credentials right after the team is generated
    setGeneratedCredentials(created);
    setShowCredentialsModal(true);
  };

  // Pair 2 Selected Members from Pool
  const handlePairSelectedFromPool = async () => {
    if (selectedPoolIndices.length !== 2) {
      alert("Please select exactly 2 members to pair together.");
      return;
    }

    const p1 = waitingPool[selectedPoolIndices[0]];
    const p2 = waitingPool[selectedPoolIndices[1]];

    sounds.playCorrect();
    const existingNames = teamsList.map((t) => t.name);
    const teamId = getNextTeamId(teams);
    const teamName = generateFunTeamName(existingNames);
    const pin = generate6DigitPin();

    const teamData = {
      id: teamId,
      name: teamName,
      pin: pin,
      player1: p1,
      player2: p2,
      score: 0,
      streak: 0,
      status: "READY"
    };

    await quizService.saveTeam(teamData);

    const updatedPool = waitingPool.filter((_, idx) => !selectedPoolIndices.includes(idx));
    updateWaitingPool(updatedPool);
    setSelectedPoolIndices([]);

    setGeneratedCredentials([teamData]);
    setShowCredentialsModal(true);
  };

  // Direct Pair & Generate Team (Requirements 1, 2, 3, 5)
  const handleDirectPair = async (e) => {
    e.preventDefault();
    setDirectPairError("");

    const p1 = directPair.member1.trim();
    const p2 = directPair.member2.trim();

    if (!p1) {
      setDirectPairError("Member 1 name is required.");
      sounds.playWrong();
      return;
    }

    sounds.playCorrect();
    const existingNames = teamsList.map((t) => t.name);
    const teamId = getNextTeamId(teams);
    // Requirement 2: right after pairing up we can generate a new unique team name
    const teamName = generateFunTeamName(existingNames);
    const pin = generate6DigitPin();

    const teamData = {
      id: teamId,
      name: teamName,
      pin: pin,
      player1: p1,
      player2: p2 || "",
      score: 0,
      streak: 0,
      status: "READY"
    };

    // Requirement 3: right after adding the team update it in the player arena module
    await quizService.saveTeam(teamData);

    // Reset form for next pair
    setDirectPair({ member1: "", member2: "" });

    // Requirement 5: the admin gets all the credentials right after the team is generated
    setGeneratedCredentials([teamData]);
    setShowCredentialsModal(true);
  };

  // Copy Credentials Slip to Clipboard (Requirement 5)
  const handleCopyCredentials = (team) => {
    const slip = `🏆 FUNQUIZ 2026 • ARENA LOGIN CREDENTIALS\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Team Name : ${team.name}\n` +
      `Login PIN : ${team.pin}\n` +
      `Team ID   : ${team.id}\n` +
      `Members   : ${team.player1}${team.player2 ? " & " + team.player2 : " (Solo)"}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Login URL : ${window.location.origin}\n` +
      `Enter your 6-digit PIN to enter the live arena!`;

    navigator.clipboard.writeText(slip);
    sounds.playSelect();
    setCopiedSlipId(team.id);
    setTimeout(() => setCopiedSlipId(null), 2500);
  };

  const handleCopyAllCredentials = () => {
    sounds.playSelect();
    const allSlips = generatedCredentials.map((team, idx) =>
      `[Team #${idx + 1}] ${team.name} | PIN: ${team.pin} | Members: ${team.player1}${team.player2 ? " & " + team.player2 : ""}`
    ).join("\n");

    navigator.clipboard.writeText(allSlips);
    setCopiedSlipId("all");
    setTimeout(() => setCopiedSlipId(null), 2500);
  };

  // Open Edit Team Modal
  const handleOpenEdit = (team) => {
    sounds.playSelect();
    setEditingTeam(team);
    setEditForm({
      name: team.name,
      pin: team.pin,
      player1: team.player1 || "",
      player2: team.player2 || ""
    });
    setEditError("");
  };

  // Save Edit Team
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setEditError("Team Name is required.");
      sounds.playWrong();
      return;
    }
    if (!editForm.player1.trim()) {
      setEditError("Player 1 is required.");
      sounds.playWrong();
      return;
    }
    if (!editForm.pin.trim() || editForm.pin.trim().length !== 6) {
      setEditError("PIN must be exactly 6 digits.");
      sounds.playWrong();
      return;
    }

    await quizService.saveTeam({
      id: editingTeam.id,
      name: editForm.name.trim(),
      pin: editForm.pin.trim(),
      player1: editForm.player1.trim(),
      player2: editForm.player2.trim(),
      score: editingTeam.score || 0,
      streak: editingTeam.streak || 0,
      status: editingTeam.status || "READY"
    });

    sounds.playCorrect();
    setEditingTeam(null);
  };

  // Delete Team
  const handleDeleteTeam = async (team) => {
    if (window.confirm(`Are you sure you want to delete team "${team.name}"?`)) {
      sounds.playAlarm();
      await quizService.deleteTeam(team.id);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    sounds.playSelect();
    const headers = ["Team ID", "Team Name", "Passcode PIN", "Player 1", "Player 2", "Score", "Status"];
    const rows = teamsList.map((t) => [
      `"${t.id || ""}"`,
      `"${(t.name || "").replace(/"/g, '""')}"`,
      `"${t.pin || ""}"`,
      `"${(t.player1 || "").replace(/"/g, '""')}"`,
      `"${(t.player2 || "").replace(/"/g, '""')}"`,
      t.score || 0,
      `"${t.status || "READY"}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FunQuiz_Teams_Roster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear All Teams
  const handleClearAllTeams = async () => {
    const confirmClear = window.confirm(
      "⚠️ Are you sure you want to CLEAR ALL TEAMS? This will wipe the roster for a fresh slate so you can pair walk-in attendees from scratch."
    );
    if (!confirmClear) return;
    sounds.playAlarm();
    await quizService.clearAllTeams();
  };

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 20px 80px" }} className="fade-in">
      {/* Top Host Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border-glass)",
        paddingBottom: 18,
        marginBottom: 26,
        flexWrap: "wrap",
        gap: 16
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            boxShadow: "0 0 16px rgba(16, 185, 129, 0.4)"
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#fff" }}>
              Host Command Center
            </h1>
            <div style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600 }}>
              Authorized Proctor Session Active • Scoreboard Private to Host
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Anti-Cheat Testing Mode Toggle */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: quizState.antiCheatEnabled ? "rgba(239, 71, 111, 0.15)" : "rgba(234, 179, 8, 0.15)",
            border: `1px solid ${quizState.antiCheatEnabled ? "#ef476f" : "#eab308"}`,
            padding: "5px 12px",
            borderRadius: 20
          }}>
            <ShieldAlert size={16} color={quizState.antiCheatEnabled ? "#ef476f" : "#eab308"} />
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: quizState.antiCheatEnabled ? "#fca5a5" : "#fef08a" }}>
              Anti-Cheat:
            </span>
            <button
              onClick={handleToggleAntiCheat}
              style={{
                background: quizState.antiCheatEnabled ? "#ef476f" : "#eab308",
                color: quizState.antiCheatEnabled ? "#fff" : "#070913",
                border: "none",
                padding: "3px 10px",
                borderRadius: 10,
                fontSize: "0.72rem",
                fontWeight: 900,
                cursor: "pointer"
              }}
              title="Click to toggle. Leave DISABLED when testing on 1 laptop so tabs don't beep!"
            >
              {quizState.antiCheatEnabled ? "ENABLED (Live Strict)" : "DISABLED (1-Laptop Testing)"}
            </button>
          </div>

          <button
            onClick={() => window.open("?view=projector", "_blank")}
            className="nav-btn"
            style={{ borderColor: "rgba(247, 37, 133, 0.4)", color: "#f72585" }}
            title="Open Projector Stage for Venue Screen"
          >
            <Tv size={16} /> Open Projector Screen
          </button>

          <button
            onClick={() => {
              sounds.playSelect();
              setShowHostLogoutConfirm(true);
            }}
            className="nav-btn"
            style={{
              borderColor: "rgba(239, 71, 111, 0.4)",
              color: "#fca5a5",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
            title="Log out and lock Host Console"
          >
            <LogOut size={15} color="#ef476f" /> Logout Host Console
          </button>
        </div>
      </div>

      {/* Round Switcher Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(18, 24, 46, 0.6)",
        border: "1px solid var(--border-glass)",
        borderRadius: 16,
        padding: "12px 18px",
        marginBottom: 24
      }}>
        <div style={{ fontSize: "0.9rem", color: "#cbd5e1", fontWeight: 700 }}>
          SELECT TOURNAMENT ROUND:
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[1, 2, 3].map((r) => (
            <button
              key={r}
              onClick={() => handleSwitchRound(r)}
              className="nav-btn"
              style={{
                background: currentRound === r ? "linear-gradient(135deg, #6366f1, #a855f7)" : undefined,
                color: currentRound === r ? "#fff" : "#94a3b8",
                borderColor: currentRound === r ? "#818cf8" : undefined,
                fontWeight: 700
              }}
            >
              Round {r} {r === 1 ? "(Warmup)" : r === 2 ? "(Heat Is On)" : "(Finals)"}
            </button>
          ))}
        </div>
      </div>

      {/* Live Response Progress Hero Card */}
      <div className="glass-panel" style={{ padding: "26px 30px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
          <div>
            <div style={{ color: "var(--accent-cyan)", fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Live Participants Sync
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fff", marginTop: 4 }}>
              {answeredCount} <span style={{ fontSize: "1.2rem", color: "#94a3b8", fontWeight: 600 }}>/ {totalTeams} Teams Answered</span>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{
              display: "inline-block",
              background: isQuestionActive ? "rgba(6, 214, 160, 0.2)" : "rgba(255, 255, 255, 0.08)",
              border: `1px solid ${isQuestionActive ? "#06d6a0" : "rgba(255,255,255,0.15)"}`,
              color: isQuestionActive ? "#06d6a0" : "#94a3b8",
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: "0.8rem",
              fontWeight: 800,
              textTransform: "uppercase"
            }}>
              State: {quizState.status}
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#00f2fe", marginTop: 6 }}>
              {responsePct}% Responded
            </div>
          </div>
        </div>

        {/* Glowing Progress Bar */}
        <div style={{ height: 12, background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${responsePct}%`,
            background: "linear-gradient(90deg, #00f2fe, #4facfe, #06d6a0)",
            boxShadow: "0 0 15px rgba(0, 242, 254, 0.6)",
            transition: "width 0.4s ease"
          }} />
        </div>
      </div>

      {/* 🚀 THE 4 SIMPLIFIED SEQUENTIAL STEP BUTTONS */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Step-by-Step Question &amp; Scoreboard Flow:
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {/* STEP 1 */}
          <button
            onClick={handleStep1Launch}
            className={`step-action-btn ${(isLobby) ? "active-step" : ""}`}
            style={{
              borderColor: (isLobby) ? "#00f2fe" : undefined,
              boxShadow: (isLobby) ? "0 0 25px rgba(0, 242, 254, 0.4)" : undefined
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: (isLobby) ? "#00f2fe" : "#94a3b8", fontWeight: 800, fontSize: "0.8rem" }}>
              <Play size={16} fill={isLobby ? "#00f2fe" : "none"} /> STEP 1
            </div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.15rem", margin: "6px 0 2px" }}>
              Launch Question
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Starts timer &amp; broadcasts Q{questionIndex + 1}
            </div>
          </button>

          {/* STEP 2 */}
          <button
            onClick={handleStep2Reveal}
            className={`step-action-btn ${isQuestionActive ? "active-step" : ""}`}
            style={{
              borderColor: isQuestionActive ? "#10b981" : undefined,
              boxShadow: isQuestionActive ? "0 0 25px rgba(16, 185, 129, 0.4)" : undefined
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: isQuestionActive ? "#10b981" : "#94a3b8", fontWeight: 800, fontSize: "0.8rem" }}>
              <CheckCircle2 size={16} /> STEP 2
            </div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.15rem", margin: "6px 0 2px" }}>
              Reveal Answer
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Shows correct answer &amp; wrong effects
            </div>
          </button>

          {/* STEP 3: CONTROLLED DISPLAY / CLOSE SCOREBOARD */}
          <button
            onClick={handleToggleLeaderboard}
            className={`step-action-btn ${(isQuestionRevealed || isLeaderboard) ? "active-step" : ""}`}
            style={{
              borderColor: isLeaderboard ? "#ef476f" : isQuestionRevealed ? "#f59e0b" : undefined,
              boxShadow: isLeaderboard ? "0 0 25px rgba(239, 71, 111, 0.5)" : isQuestionRevealed ? "0 0 25px rgba(245, 158, 11, 0.4)" : undefined,
              background: isLeaderboard ? "rgba(239, 71, 111, 0.2)" : undefined
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: isLeaderboard ? "#ef476f" : isQuestionRevealed ? "#f59e0b" : "#94a3b8", fontWeight: 800, fontSize: "0.8rem" }}>
              <Trophy size={16} /> STEP 3
            </div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", margin: "6px 0 2px" }}>
              {isLeaderboard ? "Close Scoreboard ✕" : `Display Scoreboard 📺`}
            </div>
            <div style={{ fontSize: "0.75rem", color: isLeaderboard ? "#fca5a5" : "#94a3b8" }}>
              {isLeaderboard ? `Dismiss & Enter Round ${currentRound < 3 ? currentRound + 1 : 3} Lobby` : `Broadcasts Round ${currentRound} standings`}
            </div>
          </button>

          {/* STEP 4 */}
          <button
            onClick={handleStep4Next}
            className="step-action-btn"
            style={{
              background: "rgba(99, 102, 241, 0.15)",
              borderColor: "rgba(129, 140, 248, 0.3)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#a5b4fc", fontWeight: 800, fontSize: "0.8rem" }}>
              <SkipForward size={16} /> STEP 4
            </div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.15rem", margin: "6px 0 2px" }}>
              Next Question
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Advances to Q{questionIndex + 2 <= roundQuestions.length ? questionIndex + 2 : "End"}
            </div>
          </button>
        </div>
      </div>

      {/* Current Question Overview Card */}
      <div className="glass-panel" style={{ padding: "26px 30px", marginBottom: 30 }}>
        {/* Card Header: title + action buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ color: "var(--accent-cyan)", fontWeight: 800, fontSize: "0.9rem", marginBottom: 2 }}>
              ROUND {currentRound} • QUESTION {questionIndex + 1} OF {roundQuestions.length || 5}
            </div>
            <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
              Points: <strong style={{ color: "#fbbf24" }}>{currentQ?.points || 1000}</strong>&nbsp;|&nbsp;Timer: <strong style={{ color: "#fbbf24" }}>{currentQ?.timeLimit || 20}s</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => handleOpenAddQuestion(currentRound)}
              className="btn-primary"
              style={{ padding: "7px 14px", fontSize: "0.8rem", fontWeight: 700 }}
              title="Add a new question to the current round"
            >
              <Plus size={14} /> Add Question
            </button>
            <button
              onClick={() => currentQ && handleOpenEditQuestion(currentQ)}
              className="nav-btn"
              style={{ padding: "7px 14px", fontSize: "0.8rem", fontWeight: 700, borderColor: "rgba(99,102,241,0.5)", color: "#a5b4fc" }}
              title="Edit the currently active question"
            >
              <Edit3 size={14} /> Edit Current
            </button>
            <button
              onClick={() => { sounds.playSelect(); setShowQuestionBank(true); setQuestionFilterRound(currentRound); }}
              className="nav-btn"
              style={{ padding: "7px 14px", fontSize: "0.8rem", fontWeight: 700, borderColor: "rgba(0,242,254,0.4)", color: "#00f2fe" }}
              title="View and manage all questions"
            >
              <Eye size={14} /> Manage Questions ({questions.length})
            </button>
          </div>
        </div>

        {/* Question image preview if present */}
        {currentQ?.image && (
          <div style={{ marginBottom: 14 }}>
            <img
              src={currentQ.image}
              alt="Question Visual"
              style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", objectFit: "contain" }}
            />
          </div>
        )}

        <h2 style={{ fontSize: "1.5rem", color: "#fff", fontWeight: 700, lineHeight: 1.35, marginBottom: 18 }}>
          {currentQ?.question}
        </h2>

        {/* Options preview with correct answer clearly labeled */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {["A", "B", "C", "D"].map((opt) => {
            const isCorrect = currentQ?.correct === opt;
            return (
              <div
                key={opt}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: isCorrect ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.04)",
                  border: isCorrect ? "2px solid #10b981" : "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <strong style={{ color: isCorrect ? "#6ee7b7" : "#fff", marginRight: 8 }}>{opt}:</strong>
                  <span style={{ color: isCorrect ? "#fff" : "#cbd5e1" }}>{currentQ?.options?.[opt]}</span>
                </div>
                {isCorrect && (
                  <span style={{
                    background: "#10b981",
                    color: "#fff",
                    padding: "3px 8px",
                    borderRadius: 8,
                    fontSize: "0.75rem",
                    fontWeight: 800
                  }}>
                    ✓ CORRECT
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {currentQ?.funFact && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(245,158,11,0.1)", borderLeft: "3px solid #f59e0b", borderRadius: 8, fontSize: "0.82rem", color: "#fcd34d" }}>
            💡 <strong>Fun Fact:</strong> {currentQ.funFact}
          </div>
        )}
      </div>

      {/* ⚡ ATTENDANCE & MEMBER PAIRING DESK (Requirements 1, 2, 3, 5) */}
      <div className="glass-panel" style={{
        padding: "26px 30px",
        marginBottom: 30,
        border: "1px solid rgba(0, 242, 254, 0.3)",
        boxShadow: "0 0 35px rgba(0, 242, 254, 0.08)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                background: "linear-gradient(135deg, #00f2fe, #4facfe)",
                width: 34,
                height: 34,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#070913"
              }}>
                <Users size={18} />
              </div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
                Attendance &amp; Member Pairing Desk
              </h2>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>
              Add members as per attendance, pair them up, auto-generate unique gamer team names &amp; PINs, and hand out instant credentials!
            </p>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{
              background: "rgba(0, 242, 254, 0.12)",
              border: "1px solid rgba(0, 242, 254, 0.4)",
              color: "#00f2fe",
              fontSize: "0.8rem",
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 20
            }}>
              👥 {totalTeams} Teams ({totalPlayers} Players)
            </span>
            <span style={{
              background: waitingPool.length > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${waitingPool.length > 0 ? "#f59e0b" : "rgba(255, 255, 255, 0.1)"}`,
              color: waitingPool.length > 0 ? "#fbbf24" : "#94a3b8",
              fontSize: "0.8rem",
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 20
            }}>
              ⏳ {waitingPool.length} in Attendance Queue
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--border-glass)", paddingBottom: 14, marginBottom: 20 }}>
          <button
            onClick={() => setPairingTab("direct")}
            className={`nav-btn ${pairingTab === "direct" ? "active" : ""}`}
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            <Sparkles size={15} color={pairingTab === "direct" ? "#00f2fe" : "#94a3b8"} />
            <span>⚡ Quick Pair 2 Members</span>
          </button>

          <button
            onClick={() => setPairingTab("pool")}
            className={`nav-btn ${pairingTab === "pool" ? "active" : ""}`}
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            <UserPlus size={15} color={pairingTab === "pool" ? "#00f2fe" : "#94a3b8"} />
            <span>📋 Arrived Attendance Pool ({waitingPool.length})</span>
          </button>

          <button
            onClick={() => setPairingTab("roster")}
            className={`nav-btn ${pairingTab === "roster" ? "active" : ""}`}
            style={{ fontSize: "0.85rem", padding: "8px 16px" }}
          >
            <Users size={15} color={pairingTab === "roster" ? "#00f2fe" : "#94a3b8"} />
            <span>👥 View All Teams &amp; Slips ({totalTeams})</span>
          </button>
        </div>

        {/* TAB 1: QUICK DIRECT PAIR */}
        {pairingTab === "direct" && (
          <form onSubmit={handleDirectPair} className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 14, alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", fontWeight: 700, marginBottom: 6 }}>
                  Member 1 Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  value={directPair.member1}
                  onChange={(e) => setDirectPair({ ...directPair, member1: e.target.value })}
                  className="neon-input"
                  style={{ width: "100%", padding: "10px 14px", fontSize: "0.9rem" }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", fontWeight: 700, marginBottom: 6 }}>
                  Member 2 Full Name (Optional / Partner)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Diya Patel (leave empty for Solo)"
                  value={directPair.member2}
                  onChange={(e) => setDirectPair({ ...directPair, member2: e.target.value })}
                  className="neon-input"
                  style={{ width: "100%", padding: "10px 14px", fontSize: "0.9rem" }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    padding: "11px 22px",
                    fontSize: "0.92rem",
                    fontWeight: 800,
                    boxShadow: "0 0 20px rgba(0, 242, 254, 0.4)",
                    whiteSpace: "nowrap"
                  }}
                >
                  <Sparkles size={16} /> Pair &amp; Generate Team
                </button>
              </div>
            </div>

            {directPairError && (
              <div style={{ color: "#ef476f", fontSize: "0.85rem", fontWeight: 700, marginTop: 10 }}>
                ⚠️ {directPairError}
              </div>
            )}

            <div style={{ marginTop: 12, color: "#64748b", fontSize: "0.8rem" }}>
              💡 When you click Pair, an <strong>epic gamer team name</strong> &amp; <strong>6-digit PIN</strong> are automatically generated, synced to the Player Arena immediately, and presented in a copyable slip!
            </div>
          </form>
        )}

        {/* TAB 2: ARRIVED ATTENDANCE POOL */}
        {pairingTab === "pool" && (
          <div className="fade-in">
            <form onSubmit={handleAddMemberToPool} style={{ display: "flex", gap: 12, marginBottom: 18 }}>
              <input
                type="text"
                placeholder="Enter arrived attendee's name (press Enter to add)..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="neon-input"
                style={{ flex: 1, padding: "10px 14px", fontSize: "0.9rem" }}
              />
              <button type="submit" className="btn-primary" style={{ padding: "10px 20px", fontSize: "0.85rem" }}>
                <Plus size={16} /> Add to Queue
              </button>
            </form>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.03)",
              padding: "10px 16px",
              borderRadius: 10,
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 10
            }}>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Select 2 members to pair, or auto-pair the entire attendance queue:
              </span>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {selectedPoolIndices.length === 2 && (
                  <button
                    onClick={handlePairSelectedFromPool}
                    className="btn-primary"
                    style={{ background: "#10b981", padding: "6px 14px", fontSize: "0.8rem" }}
                  >
                    ⚡ Pair Selected 2 Members
                  </button>
                )}

                <button
                  onClick={handleAutoPairPool}
                  disabled={waitingPool.length < 2}
                  className="btn-primary"
                  style={{
                    padding: "6px 16px",
                    fontSize: "0.8rem",
                    opacity: waitingPool.length < 2 ? 0.5 : 1,
                    cursor: waitingPool.length < 2 ? "not-allowed" : "pointer"
                  }}
                >
                  <Dices size={15} /> 🎲 Auto-Pair All ({Math.floor(waitingPool.length / 2)} Teams)
                </button>

                {waitingPool.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm("Clear all members in waiting pool?")) {
                        updateWaitingPool([]);
                        setSelectedPoolIndices([]);
                      }
                    }}
                    className="nav-btn"
                    style={{ padding: "6px 12px", fontSize: "0.75rem", color: "#fca5a5" }}
                  >
                    Clear Pool
                  </button>
                )}
              </div>
            </div>

            {waitingPool.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "0.9rem" }}>
                No members in the queue yet. Type participant names above as they arrive at the event!
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, maxHeight: 220, overflowY: "auto", padding: 4 }}>
                {waitingPool.map((name, idx) => {
                  const isSelected = selectedPoolIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleTogglePoolSelect(idx)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: isSelected ? "rgba(0, 242, 254, 0.2)" : "rgba(255, 255, 255, 0.05)",
                        border: `1px solid ${isSelected ? "#00f2fe" : "rgba(255, 255, 255, 0.1)"}`,
                        color: isSelected ? "#00f2fe" : "#e2e8f0",
                        padding: "6px 14px",
                        borderRadius: 20,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        userSelect: "none"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ cursor: "pointer", accentColor: "#00f2fe" }}
                      />
                      <strong>{name}</strong>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromPool(idx);
                        }}
                        style={{ color: "#94a3b8", cursor: "pointer", marginLeft: 4 }}
                        title="Remove member"
                      >
                        ×
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ROSTER & CREDENTIALS SLIPS */}
        {pairingTab === "roster" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Filter by team, player, or PIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="neon-input"
                  style={{ width: 260, padding: "7px 12px", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleExportCsv} className="nav-btn" style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                  <Download size={14} /> Export CSV Slips
                </button>
                <button onClick={handleClearAllTeams} className="nav-btn" style={{ padding: "6px 12px", fontSize: "0.75rem", color: "#fca5a5", borderColor: "rgba(239, 71, 111, 0.4)" }}>
                  <Trash2 size={13} color="#ef476f" /> Reset All Teams
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ color: "#94a3b8", fontSize: "0.8rem", borderBottom: "1px solid var(--border-glass)" }}>
                    <th style={{ padding: "8px 12px" }}>Team Name &amp; ID</th>
                    <th style={{ padding: "8px 12px" }}>6-Digit PIN</th>
                    <th style={{ padding: "8px 12px" }}>Members</th>
                    <th style={{ padding: "8px 12px" }}>Score</th>
                    <th style={{ padding: "8px 12px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 700, color: "#fff" }}>{t.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>{t.id}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span style={{
                            fontFamily: "monospace",
                            color: revealedPins[t.id] ? "#00f2fe" : "#94a3b8",
                            fontWeight: 800,
                            background: "rgba(0, 242, 254, 0.08)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            letterSpacing: revealedPins[t.id] ? "0.06em" : "0.2em",
                            fontSize: "0.85rem"
                          }}>
                            {revealedPins[t.id] ? t.pin : "••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealPin(t.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: revealedPins[t.id] ? "#00f2fe" : "#64748b",
                              cursor: "pointer",
                              padding: 3,
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                            title={revealedPins[t.id] ? "Hide PIN" : "Reveal PIN (Host only)"}
                          >
                            {revealedPins[t.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#cbd5e1", fontSize: "0.85rem" }}>
                        {t.player1} {t.player2 && <span style={{ color: "#94a3b8" }}>&amp; {t.player2}</span>}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 800, color: "#eab308" }}>
                        {t.score || 0} PTS
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            onClick={() => handleCopyCredentials(t)}
                            className="nav-btn"
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              color: copiedSlipId === t.id ? "#10b981" : "#cbd5e1",
                              borderColor: copiedSlipId === t.id ? "#10b981" : undefined
                            }}
                            title="Copy Login Slip for WhatsApp/SMS"
                          >
                            <Copy size={12} />
                            <span>{copiedSlipId === t.id ? "Copied!" : "Copy Slip"}</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="nav-btn"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            title="Edit Members / PIN"
                          >
                            <Edit3 size={12} />
                          </button>

                          <button
                            onClick={() => handleDeleteTeam(t)}
                            className="nav-btn"
                            style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#fca5a5" }}
                            title="Delete Team"
                          >
                            <Trash2 size={12} color="#ef476f" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 🎉 INSTANT CREDENTIALS GENERATED POPUP (Requirements 2 & 5) */}
      {showCredentialsModal && (
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
            maxWidth: 620,
            width: "100%",
            padding: "32px 30px",
            border: "2px solid rgba(0, 242, 254, 0.5)",
            boxShadow: "0 0 60px rgba(0, 242, 254, 0.3)",
            position: "relative"
          }}>
            <button
              onClick={() => setShowCredentialsModal(false)}
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: 4
              }}
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid #10b981",
                color: "#10b981",
                padding: "6px 16px",
                borderRadius: 20,
                fontSize: "0.85rem",
                fontWeight: 800,
                marginBottom: 12
              }}>
                <CheckCircle2 size={16} /> Live in Player Arena Gate
              </div>

              <h2 style={{ fontSize: "1.7rem", fontWeight: 900, color: "#fff", marginBottom: 6 }}>
                🎉 Team Credentials Generated!
              </h2>
              <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
                {generatedCredentials.length === 1
                  ? "Your paired team is ready! Hand these credentials to the players:"
                  : `Successfully generated ${generatedCredentials.length} teams! Hand credentials to the players:`}
              </p>
            </div>

            {/* Generated Teams List / Slips */}
            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
              {generatedCredentials.map((team, idx) => (
                <div
                  key={team.id || idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(0, 242, 254, 0.3)",
                    borderRadius: 14,
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>
                        {team.name}
                      </span>
                      <span style={{
                        fontSize: "0.72rem",
                        color: "#94a3b8",
                        background: "rgba(255, 255, 255, 0.08)",
                        padding: "2px 6px",
                        borderRadius: 6,
                        fontFamily: "monospace"
                      }}>
                        {team.id}
                      </span>
                    </div>

                    <div style={{ color: "#cbd5e1", fontSize: "0.88rem" }}>
                      Players: <strong style={{ color: "#00f2fe" }}>{team.player1}</strong> {team.player2 && <span>&amp; <strong style={{ color: "#00f2fe" }}>{team.player2}</strong></span>}
                    </div>
                  </div>

                  {/* PIN & Copy Slip */}
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <div style={{
                      background: "linear-gradient(135deg, #00f2fe, #4facfe)",
                      color: "#070913",
                      fontWeight: 900,
                      fontSize: "1.3rem",
                      padding: "4px 14px",
                      borderRadius: 8,
                      fontFamily: "monospace",
                      letterSpacing: "0.08em",
                      boxShadow: "0 0 16px rgba(0, 242, 254, 0.4)"
                    }}>
                      PIN: {team.pin}
                    </div>

                    <button
                      onClick={() => handleCopyCredentials(team)}
                      className="nav-btn"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        color: copiedSlipId === team.id ? "#10b981" : "#cbd5e1",
                        borderColor: copiedSlipId === team.id ? "#10b981" : undefined
                      }}
                    >
                      <Copy size={12} />
                      <span>{copiedSlipId === team.id ? "Copied!" : "Copy Slip"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              {generatedCredentials.length > 1 && (
                <button
                  onClick={handleCopyAllCredentials}
                  className="nav-btn"
                  style={{
                    padding: "10px 16px",
                    fontSize: "0.85rem",
                    color: copiedSlipId === "all" ? "#10b981" : undefined
                  }}
                >
                  <Copy size={14} />
                  <span>{copiedSlipId === "all" ? "All Copied!" : "Copy All Credentials"}</span>
                </button>
              )}

              <button
                onClick={() => {
                  sounds.playSelect();
                  setShowCredentialsModal(false);
                }}
                className="btn-primary"
                style={{
                  padding: "10px 24px",
                  fontSize: "0.9rem",
                  marginLeft: "auto"
                }}
              >
                <Check size={16} /> Done / Pair Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TEAM MODAL */}
      {editingTeam && (
        <div
          className="disqualification-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10, 14, 30, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20
          }}
        >
          <div className="glass-panel" style={{ maxWidth: 480, width: "100%", padding: "30px", border: "1px solid rgba(0, 242, 254, 0.4)" }}>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", marginBottom: 16 }}>
              Edit Team Credentials
            </h3>

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: 6, fontWeight: 700 }}>
                  Team Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="neon-input"
                  style={{ width: "100%", padding: "8px 12px" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: 6, fontWeight: 700 }}>
                  6-Digit Passcode (PIN)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={editForm.pin}
                  onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })}
                  className="neon-input"
                  style={{ width: "100%", padding: "8px 12px", fontFamily: "monospace" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: 6, fontWeight: 700 }}>
                  Player 1 Name
                </label>
                <input
                  type="text"
                  value={editForm.player1}
                  onChange={(e) => setEditForm({ ...editForm, player1: e.target.value })}
                  className="neon-input"
                  style={{ width: "100%", padding: "8px 12px" }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#cbd5e1", marginBottom: 6, fontWeight: 700 }}>
                  Player 2 Name (Optional)
                </label>
                <input
                  type="text"
                  value={editForm.player2}
                  onChange={(e) => setEditForm({ ...editForm, player2: e.target.value })}
                  className="neon-input"
                  style={{ width: "100%", padding: "8px 12px" }}
                />
              </div>

              {editError && (
                <div style={{ color: "#ef476f", fontSize: "0.85rem", fontWeight: 700, marginBottom: 14 }}>
                  ⚠️ {editError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="nav-btn"
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: "8px 20px" }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 👑 LIVE AUTO-UPDATING HOST SCOREBOARD (Visible Only To Host) */}
      <div className="glass-panel" style={{ padding: "26px 30px", marginBottom: 30 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>
                Live Leaderboard &amp; Participant Scores
              </h2>
              <span style={{
                background: "rgba(16, 185, 129, 0.2)",
                color: "#10b981",
                border: "1px solid #10b981",
                fontSize: "0.75rem",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: 12
              }}>
                Auto-Updating Live
              </span>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 4 }}>
              Scores auto-update after each response. Participants only see this when you click <strong>Step 3: Display Scoreboard</strong>.
            </p>
          </div>

          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search team or player..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neon-input"
              style={{ width: 240, padding: "8px 14px 8px 36px", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        {/* Scoreboard Table */}
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ color: "#94a3b8", fontSize: "0.8rem", borderBottom: "1px solid var(--border-glass)" }}>
                <th style={{ padding: "10px 14px" }}>Rank</th>
                <th style={{ padding: "10px 14px" }}>Team Name</th>
                <th style={{ padding: "10px 14px" }}>Paired Players</th>
                <th style={{ padding: "10px 14px" }}>Total Score</th>
                <th style={{ padding: "10px 14px" }}>Streak</th>
                <th style={{ padding: "10px 14px" }}>Q{questionIndex + 1} Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((t, idx) => {
                const ans = t.answers && t.answers[currentQId];
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px 14px", fontWeight: 800, fontSize: "1rem" }}>
                      {idx === 0 ? "👑 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "#fff" }}>
                      {t.name}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "0.85rem" }}>
                      {t.player1} &amp; {t.player2}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 900, color: "#eab308", fontSize: "1.05rem" }}>
                      {t.score || 0} <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>PTS</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {t.streak > 1 ? (
                        <span style={{ color: "#ffb703", fontWeight: 800, fontSize: "0.85rem" }}>
                          🔥 {t.streak}x
                        </span>
                      ) : (
                        <span style={{ color: "#64748b" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {ans ? (
                        <span style={{
                          background: ans.isCorrect ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 71, 111, 0.2)",
                          color: ans.isCorrect ? "#10b981" : "#ef476f",
                          padding: "3px 8px",
                          borderRadius: 8,
                          fontSize: "0.8rem",
                          fontWeight: 700
                        }}>
                          Opt {ans.selectedOption} (+{ans.pointsEarned || 0})
                        </span>
                      ) : (
                        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>Waiting...</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Drawer: Anti-Cheat & Sync Options */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="nav-btn"
          style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "0.95rem" }}
        >
          {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          <span>{showAdvanced ? "Hide Anti-Cheat Sentinel & Advanced Tools" : "Show Advanced Tools (Anti-Cheat Sentinel & Reset)"}</span>
          {disqualifiedTeams.length > 0 && (
            <span style={{ background: "#ef476f", color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: "0.75rem", fontWeight: 800 }}>
              {disqualifiedTeams.length} Violations
            </span>
          )}
        </button>

        {showAdvanced && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Anti-Cheat Violations Table */}
            <div className="glass-panel" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.2rem", color: "#fff" }}>
                  Anti-Cheat Sentinel &amp; Teams Roster ({totalTeams})
                </h3>
                {disqualifiedTeams.length > 0 && (
                  <span style={{ color: "#ef476f", fontWeight: 700, fontSize: "0.9rem" }}>
                    ⚠️ {disqualifiedTeams.length} Team(s) Flagged for Disqualification
                  </span>
                )}
              </div>

              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ color: "#94a3b8", fontSize: "0.8rem", borderBottom: "1px solid var(--border-glass)" }}>
                      <th style={{ padding: "8px 12px" }}>Team</th>
                      <th style={{ padding: "8px 12px" }}>PIN</th>
                      <th style={{ padding: "8px 12px" }}>Players</th>
                      <th style={{ padding: "8px 12px" }}>Score</th>
                      <th style={{ padding: "8px 12px" }}>Status</th>
                      <th style={{ padding: "8px 12px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamsList.map((t) => (
                      <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#fff" }}>{t.name}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            fontFamily: "monospace",
                            color: revealedPins[t.id] ? "#00f2fe" : "#64748b",
                            letterSpacing: revealedPins[t.id] ? "0.05em" : "0.2em",
                            fontSize: "0.85rem"
                          }}>
                            {revealedPins[t.id] ? t.pin : "••••••"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "0.85rem" }}>{t.player1} &amp; {t.player2}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 800, color: "#eab308" }}>{t.score || 0}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {t.disqualified ? (
                            <span style={{ background: "#ef476f", color: "#fff", padding: "2px 8px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 700 }}>
                              DISQUALIFIED
                            </span>
                          ) : (
                            <span style={{ color: "#10b981", fontSize: "0.8rem", fontWeight: 700 }}>OK</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {t.disqualified && (
                            <button
                              onClick={() => handleReinstate(t.id)}
                              className="btn-primary"
                              style={{ background: "#10b981", padding: "4px 10px", fontSize: "0.75rem" }}
                            >
                              Pardon
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>



            {/* Reset Entire Quiz */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              background: "rgba(239, 71, 111, 0.08)",
              border: "1px dashed rgba(239, 71, 111, 0.4)",
              borderRadius: 14
            }}>
              <div>
                <strong style={{ color: "#ef476f" }}>Reset Tournament Session</strong>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Clears all team scores, resets to Round 1 Lobby.
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to reset all team scores?")) {
                    quizService.resetQuiz();
                    sounds.playAlarm();
                  }
                }}
                className="btn-danger"
              >
                <RotateCcw size={16} /> Reset Scores
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* HOST LOGOUT CONFIRMATION MODAL                            */}
      {/* ========================================================= */}
      {showHostLogoutConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(7, 9, 19, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #0f172a, #1e1b4b)",
            border: "1px solid rgba(239,71,111,0.5)",
            borderRadius: 20,
            padding: "36px 40px",
            maxWidth: 420,
            width: "90%",
            boxShadow: "0 0 60px rgba(239,71,111,0.2)",
            textAlign: "center"
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: 8 }}>Lock Host Console?</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: 28, lineHeight: 1.6 }}>
              This will log you out of the Host Command Center. You will need your Host PIN to re-enter. Are you sure?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setShowHostLogoutConfirm(false)}
                className="nav-btn"
                style={{ padding: "10px 24px", fontSize: "0.9rem", fontWeight: 700 }}
              >
                <X size={15} /> Cancel
              </button>
              <button
                onClick={() => { setShowHostLogoutConfirm(false); onLockHost && onLockHost(); }}
                style={{
                  background: "linear-gradient(135deg, #ef476f, #dc2626)",
                  color: "#fff", border: "none", padding: "10px 24px",
                  borderRadius: 10, fontSize: "0.9rem", fontWeight: 800,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  boxShadow: "0 0 20px rgba(239,71,111,0.4)"
                }}
              >
                <LogOut size={15} /> Yes, Lock Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT QUESTION MODAL                                 */}
      {/* ========================================================= */}
      {showQuestionModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(7, 9, 19, 0.9)",
          backdropFilter: "blur(10px)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "40px 16px", overflowY: "auto"
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0f172a, #1a1040)",
            border: "1px solid rgba(99,102,241,0.5)",
            borderRadius: 20,
            padding: "32px 36px",
            maxWidth: 680,
            width: "100%",
            boxShadow: "0 0 80px rgba(99,102,241,0.2)"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>
                  {editingQuestionId ? "✏️ Edit Question" : "➕ Add New Question"}
                </h2>
                <div style={{ color: "#a5b4fc", fontSize: "0.8rem", marginTop: 2 }}>All fields marked * are required</div>
              </div>
              <button
                onClick={() => setShowQuestionModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Row: Round + Question Number + Points + Timer */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>Round *</label>
                  <select
                    value={questionForm.round}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, round: Number(e.target.value) }))}
                    className="neon-input"
                    style={{ fontSize: "0.88rem", padding: "8px 10px" }}
                  >
                    <option value={1}>Round 1 (Warmup)</option>
                    <option value={2}>Round 2 (Heat)</option>
                    <option value={3}>Round 3 (Finals)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>Q No.</label>
                  <input
                    type="number" min={1}
                    value={questionForm.number}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, number: e.target.value }))}
                    className="neon-input"
                    style={{ fontSize: "0.88rem", padding: "8px 10px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>Points</label>
                  <input
                    type="number" min={100} step={100}
                    value={questionForm.points}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, points: e.target.value }))}
                    className="neon-input"
                    style={{ fontSize: "0.88rem", padding: "8px 10px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>Timer (sec)</label>
                  <input
                    type="number" min={5} max={120}
                    value={questionForm.timeLimit}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, timeLimit: e.target.value }))}
                    className="neon-input"
                    style={{ fontSize: "0.88rem", padding: "8px 10px" }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>Question Text *</label>
                <textarea
                  rows={3}
                  placeholder="Type your question here..."
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                  className="neon-input"
                  style={{ fontSize: "0.92rem", padding: "10px 14px", resize: "vertical" }}
                  required
                />
              </div>

              {/* Image Section */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(99,102,241,0.4)", borderRadius: 14, padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <ImageIcon size={16} color="#a5b4fc" />
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#a5b4fc" }}>Question Image (Optional)</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: 5 }}>📁 Upload from device (max 2MB)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      style={{ fontSize: "0.8rem", color: "#cbd5e1", width: "100%" }}
                    />
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center" }}>— OR —</div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: 5 }}>🔗 Paste image URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={typeof questionForm.image === "string" && questionForm.image.startsWith("http") ? questionForm.image : ""}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, image: e.target.value || null }))}
                      className="neon-input"
                      style={{ fontSize: "0.82rem", padding: "8px 12px" }}
                    />
                  </div>
                </div>

                {/* Image Preview */}
                {questionForm.image && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <img
                      src={questionForm.image}
                      alt="Preview"
                      style={{ maxHeight: 120, maxWidth: 220, borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", objectFit: "contain", background: "#000" }}
                    />
                    <button
                      type="button"
                      onClick={() => setQuestionForm(prev => ({ ...prev, image: null }))}
                      style={{ background: "rgba(239,71,111,0.2)", border: "1px solid rgba(239,71,111,0.4)", color: "#ef476f", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700 }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Options Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {["A", "B", "C", "D"].map((opt) => (
                  <div key={opt}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: opt === questionForm.correct ? "#6ee7b7" : "#cbd5e1", marginBottom: 5 }}>
                      Option {opt} {opt === questionForm.correct && "✓ (Correct)"}{opt === "A" || opt === "B" ? " *" : ""}
                    </label>
                    <input
                      type="text"
                      placeholder={`Option ${opt}${opt === "C" || opt === "D" ? " (optional)" : ""}`}
                      value={questionForm[`option${opt}`]}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, [`option${opt}`]: e.target.value }))}
                      className="neon-input"
                      style={{
                        fontSize: "0.88rem", padding: "8px 12px",
                        borderColor: opt === questionForm.correct ? "rgba(16,185,129,0.6)" : undefined,
                        background: opt === questionForm.correct ? "rgba(16,185,129,0.08)" : undefined
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Correct Answer Selector */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 8 }}>Correct Answer *</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["A", "B", "C", "D"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => { sounds.playSelect(); setQuestionForm(prev => ({ ...prev, correct: opt })); }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 10,
                        border: questionForm.correct === opt ? "2px solid #10b981" : "1px solid rgba(255,255,255,0.12)",
                        background: questionForm.correct === opt ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)",
                        color: questionForm.correct === opt ? "#6ee7b7" : "#94a3b8",
                        fontWeight: 800, fontSize: "1rem", cursor: "pointer"
                      }}
                    >
                      {opt} {questionForm.correct === opt && "✓"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fun Fact */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>💡 Fun Fact (shown after reveal, optional)</label>
                <input
                  type="text"
                  placeholder="Interesting fact revealed after the answer..."
                  value={questionForm.funFact}
                  onChange={(e) => setQuestionForm(prev => ({ ...prev, funFact: e.target.value }))}
                  className="neon-input"
                  style={{ fontSize: "0.88rem", padding: "8px 12px" }}
                />
              </div>

              {/* Error */}
              {questionFormError && (
                <div style={{ color: "#ef476f", fontWeight: 700, fontSize: "0.85rem", background: "rgba(239,71,111,0.1)", padding: "8px 14px", borderRadius: 8 }}>
                  ⚠️ {questionFormError}
                </div>
              )}

              {/* Form Actions */}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="nav-btn"
                  style={{ padding: "10px 20px", fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: "10px 28px", fontSize: "0.95rem", fontWeight: 800, boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}
                >
                  <Check size={15} /> {editingQuestionId ? "Save Changes" : "Add Question"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* QUESTION BANK DRAWER                                      */}
      {/* ========================================================= */}
      {showQuestionBank && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9997,
          background: "rgba(7, 9, 19, 0.88)",
          backdropFilter: "blur(10px)",
          display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
          padding: 0
        }}>
          <div style={{
            background: "linear-gradient(145deg, #0d1225, #1a1040)",
            borderLeft: "1px solid rgba(0,242,254,0.3)",
            width: "min(700px, 95vw)",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-40px 0 80px rgba(0,0,0,0.5)"
          }}>
            {/* Drawer Header */}
            <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border-glass)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", margin: 0 }}>📋 Question Bank</h2>
                <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 3 }}>{questions.length} total questions across all rounds</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => handleOpenAddQuestion(questionFilterRound)}
                  className="btn-primary"
                  style={{ padding: "7px 14px", fontSize: "0.8rem", fontWeight: 700 }}
                >
                  <Plus size={14} /> Add Question
                </button>
                <button
                  onClick={() => setShowQuestionBank(false)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Round Tabs */}
            <div style={{ display: "flex", gap: 8, padding: "14px 28px", borderBottom: "1px solid var(--border-glass)", flexShrink: 0 }}>
              {[1, 2, 3].map(r => (
                <button
                  key={r}
                  onClick={() => setQuestionFilterRound(r)}
                  className={`nav-btn ${questionFilterRound === r ? "active" : ""}`}
                  style={{
                    fontSize: "0.82rem",
                    background: questionFilterRound === r ? "linear-gradient(135deg, #6366f1, #a855f7)" : undefined,
                    color: questionFilterRound === r ? "#fff" : "#94a3b8",
                    borderColor: questionFilterRound === r ? "#818cf8" : undefined
                  }}
                >
                  Round {r} ({questions.filter(q => q.round === r).length})
                </button>
              ))}
              <button
                onClick={handleResetQuestions}
                className="nav-btn"
                style={{ marginLeft: "auto", fontSize: "0.78rem", borderColor: "rgba(239,71,111,0.4)", color: "#fca5a5" }}
                title="Reset to default 15 curated questions"
              >
                <RotateCcw size={12} /> Reset to Default
              </button>
            </div>

            {/* Question List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px" }}>
              {questions.filter(q => q.round === questionFilterRound).length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748b", padding: "60px 0", fontSize: "0.9rem" }}>
                  No questions in Round {questionFilterRound} yet.
                  <br />
                  <button
                    onClick={() => handleOpenAddQuestion(questionFilterRound)}
                    className="btn-primary"
                    style={{ marginTop: 16, padding: "8px 18px", fontSize: "0.85rem" }}
                  >
                    <Plus size={14} /> Add First Question
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {questions
                    .filter(q => q.round === questionFilterRound)
                    .sort((a, b) => (a.number || 0) - (b.number || 0))
                    .map((q, idx) => {
                      const isActive = q.id === quizState.activeQuestionId;
                      return (
                        <div
                          key={q.id}
                          style={{
                            background: isActive ? "rgba(0,242,254,0.08)" : "rgba(255,255,255,0.04)",
                            border: isActive ? "1px solid rgba(0,242,254,0.5)" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 14,
                            padding: "14px 16px",
                            display: "flex",
                            gap: 14,
                            alignItems: "flex-start"
                          }}
                        >
                          {/* Thumbnail */}
                          <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 10, overflow: "hidden", background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {q.image ? (
                              <img src={q.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <HelpCircle size={22} color="#6366f1" />
                            )}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: "0.73rem", fontWeight: 800, color: "#a5b4fc", background: "rgba(99,102,241,0.2)", padding: "2px 8px", borderRadius: 6 }}>Q{q.number || idx + 1}</span>
                              {isActive && <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#00f2fe", background: "rgba(0,242,254,0.15)", padding: "2px 8px", borderRadius: 6 }}>▶ ACTIVE</span>}
                              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{q.points || 1000}pts • {q.timeLimit || 20}s</span>
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6ee7b7", marginLeft: "auto" }}>Ans: {q.correct}</span>
                            </div>
                            <div style={{ fontSize: "0.88rem", color: "#e2e8f0", fontWeight: 600, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {q.question}
                            </div>
                            <div style={{ display: "flex", gap: 6, marginTop: 4, fontSize: "0.72rem", color: "#64748b", flexWrap: "wrap" }}>
                              {["A", "B", "C", "D"].map(opt => (
                                <span key={opt} style={{ color: q.correct === opt ? "#6ee7b7" : "#64748b", fontWeight: q.correct === opt ? 700 : 400 }}>
                                  {opt}: {q.options?.[opt]?.slice(0, 20) || "-"}{q.options?.[opt]?.length > 20 ? "..." : ""}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => handleJumpToQuestion(q)}
                              className="nav-btn"
                              style={{ padding: "5px 10px", fontSize: "0.72rem", fontWeight: 700, borderColor: "rgba(0,242,254,0.4)", color: "#00f2fe" }}
                              title="Set as active question in Lobby"
                            >
                              <Play size={11} /> Jump
                            </button>
                            <button
                              onClick={() => { setShowQuestionBank(false); handleOpenEditQuestion(q); }}
                              className="nav-btn"
                              style={{ padding: "5px 10px", fontSize: "0.72rem", fontWeight: 700, borderColor: "rgba(99,102,241,0.5)", color: "#a5b4fc" }}
                            >
                              <Edit3 size={11} /> Edit
                            </button>

                            {/* Inline Delete Confirm — no window.confirm which is suppressed in overlays */}
                            {deleteConfirmId === q.id ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <div style={{ fontSize: "0.68rem", color: "#fca5a5", fontWeight: 700, textAlign: "center" }}>Sure?</div>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    style={{
                                      flex: 1, padding: "4px 6px", fontSize: "0.68rem", fontWeight: 800,
                                      background: "#ef476f", border: "none", borderRadius: 6,
                                      color: "#fff", cursor: "pointer"
                                    }}
                                    title="Yes, delete this question"
                                  >
                                    ✓ Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    style={{
                                      flex: 1, padding: "4px 6px", fontSize: "0.68rem", fontWeight: 800,
                                      background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                                      borderRadius: 6, color: "#94a3b8", cursor: "pointer"
                                    }}
                                    title="Cancel"
                                  >
                                    ✗ No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { sounds.playSelect(); setDeleteConfirmId(q.id); }}
                                className="nav-btn"
                                style={{ padding: "5px 10px", fontSize: "0.72rem", fontWeight: 700, borderColor: "rgba(239,71,111,0.4)", color: "#ef476f" }}
                              >
                                <Trash2 size={11} /> Del
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
