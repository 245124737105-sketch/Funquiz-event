# 📋 Complete Guide: Google Form & Sheets Setup for FunQuiz

This guide shows you step-by-step how to set up the **Participant Registration Google Form**, automatically link it with **Google Sheets**, run the **Auto-Pairing Script to generate Fun Team Names & 6-Digit Passcodes**, and sync everything into your FunQuiz live web application!

---

## 🚀 Step 1: Create the Google Form for Registrations

1. Go to [forms.google.com](https://forms.google.com) and create a **Blank Form**.
2. Title it: **"FunQuiz 2026 Registration"** (or your event name).
3. Add the following fields:
   - **Full Name** (Short Answer, *Required*)
   - **Email Address** (Short Answer, *Required*)
   - **Phone Number / WhatsApp** (Short Answer, *Required*)
   - **College / Department / Roll No** (Short Answer, *Required*)
4. Click on **Settings**:
   - Limit to 1 response (optional, or collect emails automatically).
5. Click **Responses** tab at the top of the Google Form.
6. Click **Link to Sheets** (the green Sheets icon) -> **Create a new spreadsheet** -> Name it `FunQuiz Master Event`.
7. Click **Create**. This opens your linked Google Sheet!

---

## ⚡ Step 2: Install the FunQuiz Automation Script in Google Sheets

1. In your newly created Google Sheet, click on the top menu: **Extensions** > **Apps Script**.
2. Erase any code inside `Code.gs`.
3. Open `google-apps-script/Code.gs` from this project, copy the entire code, and paste it into the Apps Script editor.
4. Click the **💾 Save** icon (Ctrl + S), and rename the Apps Script project to `FunQuiz Automation`.
5. Return to your Google Sheet tab and **refresh the browser page** (F5).
6. After 3-5 seconds, you will see a brand new menu item appear in the top bar: **⚡ FunQuiz Controls**!

---

## 🎮 Step 3: Attendance & Team Creation (Choose Your Workflow)

Click the **⚡ FunQuiz Controls** menu and use the options:

### 1. Click "1. Initialize Sheets Template (with Attendance)"
- Formats your sheet tabs: `Registrations`, `Teams`, and `Questions`.
- Adds an **"Attended / Present" checkbox column (Column F)** to your Registrations tab.

---

### Workflow A: Live Venue Attendance (Auto-Pair Only Present Attendees)
*Best when you have ~200 registrations and want to pair only the people who physically arrived:*
1. As participants arrive at the registration desk, simply **tick their checkbox in Column F ("Attended / Present")**.
2. When ready, click **⚡ FunQuiz Controls > 2a. Auto-Pair ONLY Present / Attended Members**.
3. The script:
   - Filters out absent registrants.
   - Pairs only verified present attendees 2-by-2.
   - Auto-generates unique fun team names (*Quantum Ninjas*, *Cyber Otters*, etc.) and **6-digit login PINs**.
   - Populates the `Teams` sheet ready for tournament play!

---

### Workflow B: Manual Custom Pairing in Google Sheets
*Best when organizers manually choose who pairs with whom:*
1. Open the **`Teams`** sheet.
2. Manually write or paste **Player 1 Name (Column D)** and **Player 2 Name (Column F)**.
   *(Optional: You can also type your own custom Team Name in Column B, or leave it blank to let the script name it!)*
3. Click **⚡ FunQuiz Controls > 2b. Generate PINs & Names for Manually Entered Teams**.
4. The script:
   - Preserves your exact manual member pairings.
   - Generates unique Team IDs (`TEAM_001`, `TEAM_002`...).
   - Fills in cool gamer team names for any blank ones.
   - Generates random **6-digit numeric login PINs** for every team.

---

### Workflow C: Live On-The-Fly Manual Pairing in FunQuiz Web App
*Best for walk-ins or pairing players directly on the live quiz screen:*
- Go to the **Admin Dashboard** in your FunQuiz app (`/host`).
- Click **"➕ Add & Pair Team Manually"**.
- Enter Player 1 & Player 2 names, click **"🎲 Roll Fun Name"** or **"⚡ Auto PIN"**, and click **Save**!
- The team is immediately added to the live tournament and synced!

---

### Workflow D: Auto-Pair ALL Registrations (Shuffle All)
- Click **⚡ FunQuiz Controls > 2c. Auto-Pair ALL Registrations (Shuffle All)** to randomly pair all responses in the sheet regardless of attendance.

---

### 3. Setup Questions for 3 Rounds x 5 Questions:
- Click **"3. Populate Sample 3-Round Questions"** to load the pre-configured 15 curated questions.
- Or simply edit the **Questions** sheet directly with your own questions, options (A, B, C, D), correct answer, points, and timer seconds!

---

## 🔄 Step 4: Connecting with the FunQuiz Web App

You have 2 effortless ways to load the teams and questions into the web application:

### Option A: Direct Real-Time Firebase Sync (Recommended for 200 Live Concurrent Players)
1. In your Firebase Realtime Database dashboard, copy your database URL (e.g., `https://funquiz-live-default-rtdb.firebaseio.com/`).
2. In Google Sheet, click **⚡ FunQuiz Controls > 4. Sync Teams to Firebase**.
3. Paste the URL when prompted.
4. Click **⚡ FunQuiz Controls > 5. Sync Questions to Firebase**.
5. All 100 teams and 15 questions instantly sync into the FunQuiz engine in real-time!

### Option B: 1-Click JSON Instant Import (Zero-Setup)
1. In Google Sheet, click **⚡ FunQuiz Controls > Export All as JSON for FunQuiz App**.
2. A popup window will display the complete structured JSON.
3. Click inside, press **Ctrl + A** then **Ctrl + C** to copy.
4. In your FunQuiz Web App, go to **Admin Dashboard > Import JSON Data** and paste it!
5. All teams and questions are immediately loaded and ready to play!

---

## 🖨️ Step 5: Distributing Credentials to Teams
From the `Teams` tab, you can:
1. Export to PDF and print team slips (Team Name + 6-digit PIN).
2. Or use Google Sheet Mail Merge / WhatsApp Web to send:
   > *"Hello {Player 1} & {Player 2}! Your FunQuiz Team is **{Team Name}** and your 6-digit Login PIN is **{Passcode}**. Log in at: {quiz_url} and get ready to battle!"*
