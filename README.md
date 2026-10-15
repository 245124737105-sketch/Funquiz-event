# ⚡ FunQuiz 2026 • Live Tournament Arena & Automation System

An ultra-modern, gamified live quiz platform designed for **200+ concurrent participants** competing in paired 2-player teams across **3 high-energy rounds (5 questions each)**.

Includes automated **Google Form + Google Sheets participant pairing**, **6-digit PIN generation**, **Firebase Realtime sync**, an **anti-cheat fullscreen sentinel**, and a **stadium projector leaderboard**.

---

## 🚀 Quick Start (Running Locally)

The development server is already active on your machine:
- **Local URL:** [http://localhost:5173/](http://localhost:5173/)
- **Network Access:** Run `npm run dev -- --host` to broadcast to devices on your local Wi-Fi.

### Default Test Credentials:
- **Team Name:** `Quantum Otters` | **PIN:** `492018` (Players: Aarav Sharma & Diya Patel)
- **Team Name:** `Cyber Ninjas` | **PIN:** `839102` (Players: Rohan Verma & Ananya Iyer)
- **Host / Admin Passcode:** `admin2026` (Restricts and locks Host Console from participants)
- **Proctor Emergency Anti-Cheat Unlock:** `778899` or press `Ctrl + Alt + X`

---

## 🎮 Key Features & System Modules

### 1. 🔒 Private Host Console Protection
- The **Host Console** button displays a `🔒 Locked` badge to participants.
- Attempting to access the Host Console opens a password modal requiring the **Admin Master Passcode** (`admin2026`).
- Proctors can lock the console anytime using the top **Lock Host Console** button.

### 2. ⚡ Simplified 1-2-3-4 Host Question Flow
The Host Command Center is streamlined into a linear, foolproof progression:
1. **[🚀 STEP 1: Launch Question]** -> Broadcasts active question & triggers synchronized countdown.
2. **[✨ STEP 2: Reveal Answer]** -> Highlights correct answer across all screens and triggers player evaluation & wrong answer effects.
3. **[📺 STEP 3: Display / Close Scoreboard]**:
   - **During Round:** Scoreboard is **STRICTLY PRIVATE TO HOST** with live auto-updating scores and rankings after every question response. Participants only see their own score.
   - **End of Round:** Host clicks **`Display Scoreboard 📺`** to broadcast standings and podium to all participant screens and the connected venue projector.
   - **Prepare Next Round:** Host clicks **`Close Scoreboard ✕`** to dismiss the scoreboard and enter the next round waiting lobby.
4. **[⏭️ STEP 4: Next Question]** -> Advances to the next question seamlessly.
- Includes a prominent **Live Response Tracker**: e.g., `84 / 100 Teams Answered (84%)` with real-time glowing progress bar.

### 3. 👑 Private Host Live Scoreboard & Venue Projector
- **Auto-Updating Real-Time Roster:** Inside Host Console, ranks (#1, #2, #3...), team names, players, scores, streaks, and response statuses (`Opt B (+1,200)`) update live after every response.
- **Searchable:** Host can search any team or participant instantly.
- **Venue Projector:** Host laptop connects to the projector and opens the stadium display via **Open Projector Screen** button whenever ready. Participants have no access to the projector view on their own devices.

### 3. 💥 Gamified Wrong Answer Effects & Reveal
- During the question countdown, the team's selection is secured with a *"Response Locked In! 🔒"* state.
- When the Host clicks **Reveal Correct Answer**:
  - **If Wrong:** Triggers an arcade **Screen Shake**, a **Red Glitch Strobe Overlay**, a low-frequency descent buzzer sound, an **"INCORRECT ANSWER! 💥 Streak Broken"** warning banner, and highlights the correct answer in glowing emerald green with its trivia fun fact.
  - **If Correct:** Confetti explosion, victory chime, points + speed bonus breakdown, and streak flame multiplier!

### 4. 🛡️ Anti-Cheat Fullscreen Sentinel
Located in: [`google-apps-script/Code.gs`](file:///c:/Users/saiteja/OneDrive/Desktop/QuizEvent/google-apps-script/Code.gs) & [Setup Guide](file:///c:/Users/saiteja/OneDrive/Desktop/QuizEvent/google-apps-script/GOOGLE_FORM_SETUP_GUIDE.md)
- **Automatic Fair Random Pairing:** Takes all ~200 participants from Google Form responses and pairs them 2-by-2 using Fisher-Yates cryptographic shuffling.
- **Fun Gamified Team Names:** Assigns unique sci-fi/arcade team names (*"Quantum Otters"*, *"Cyber Ninjas"*, *"Neon Griffins"*, *"Laser Llamas"*, etc.).
- **6-Digit PIN Generation:** Generates random 6-digit numeric passcodes for each team.
- **1-Click Firebase & JSON Sync:** Direct menu items to sync all teams and questions to Firebase or export as JSON.

### 2. 🛡️ Anti-Cheat Fullscreen Sentinel
- Upon clicking **START TEST & ENTER FULLSCREEN**, the browser enters native fullscreen mode.
- **Strict Violation Detection:** Exiting fullscreen, switching tabs, or minimizing the window triggers an immediate **GAME TERMINATION / DISQUALIFICATION** alarm with red strobe lighting.
- **Proctor Release:** Proctors can release the team by pressing `Ctrl + Alt + X` or entering the master PIN `778899`.

### 3. 🎯 3-Round Synchronized Quiz Engine
- **Round 1 (Warmup):** 5 Questions, 20s timer, 1,000 Points each + Speed Bonus.
- **Round 2 (Heat Is On):** 5 Questions, 25s timer, 1,200 Points each + Speed Bonus.
- **Round 3 (Finals):** 5 Questions, 15s rapid-fire, 1,500 Points each + Speed Bonus.
- **Streak Multipliers:** Consecutive correct answers award `1.2x` (2-streak) and `1.5x` (3+ streak) point multipliers.
- **Audio Synthesizer:** Real-time arcade audio (ticks, chime, wrong buzzer, alarm, fanfares) synthesized via Web Audio API.

### 4. 👑 Host Master Console (`?view=admin`)
- Accessible from the top navigation bar (**Host Console**).
- Real-time live answer counter (e.g. `87 / 100 teams answered`).
- Single-click controls:
  1. `Start Question & Countdown`
  2. `Reveal Correct Answer`
  3. `Next Question`
  4. `Show Round Leaderboard`
  5. `Final Podium Celebration`
- Proctor security tab with 1-click **Pardon / Reinstate** for any flagged team.
- 1-Click JSON import from Google Sheets.

### 5. 📺 Stadium Projector Leaderboard (`?view=projector`)
- Designed for venue TV screens or stage projectors.
- Real-time voting distribution chart showing the percentage of teams picking options A, B, C, D.
- 3D Gold, Silver, and Bronze Podium with dynamic score animations and particle confetti celebration.

---

## 📋 Google Form & Google Sheets Setup Instructions

For step-by-step setup with screenshots and explanations, read:
👉 [`google-apps-script/GOOGLE_FORM_SETUP_GUIDE.md`](file:///c:/Users/saiteja/OneDrive/Desktop/QuizEvent/google-apps-script/GOOGLE_FORM_SETUP_GUIDE.md)

### Summary of Steps:
1. Create a Google Form collecting: `Full Name`, `Email`, `Phone`, `College/Dept`.
2. Link the responses to a Google Sheet.
3. Open **Extensions > Apps Script** in the sheet, paste the contents of [`google-apps-script/Code.gs`](file:///c:/Users/saiteja/OneDrive/Desktop/QuizEvent/google-apps-script/Code.gs), and save.
4. Refresh the sheet and use the custom menu **⚡ FunQuiz Controls**:
   - Click **1. Initialize Sheets Template**
   - Click **2. Pair Participants & Generate Teams** (pairs 200 participants into 100 teams with names and 6-digit PINs)
   - Click **3. Populate Sample 3-Round Questions** (or enter your custom questions)
   - Click **Export All as JSON** and paste into FunQuiz Admin Dashboard!
