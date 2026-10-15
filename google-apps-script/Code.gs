/**
 * =====================================================================
 * FUNQUIZ EVENT AUTOMATION - GOOGLE APPS SCRIPT
 * =====================================================================
 * Features:
 * 1. Automatically pairs 200+ participants (from Google Form responses)
 *    into 2-player teams.
 * 2. Generates epic & hilarious gamified team names + 6-digit PINs.
 * 3. Populates 3 Rounds x 5 Questions template or syncs custom questions.
 * 4. 1-Click Sync to Firebase Realtime Database for live synchronized play.
 * 5. Can also serve as a JSON Web API endpoint for fallback fetching.
 * =====================================================================
 */

// Configuration: Insert your Firebase Realtime DB URL (leave empty if using manual export)
const FIREBASE_DB_URL = "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com";
const FIREBASE_AUTH_SECRET = ""; // Optional: Database Secret or empty if rules allow read/write during quiz

/**
 * Adds a custom menu in Google Sheets on open
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ FunQuiz Controls')
    .addItem('1. Initialize Sheets Template (with Attendance)', 'setupSheetsTemplate')
    .addSeparator()
    .addItem('2a. Auto-Pair ONLY Present / Attended Members', 'pairAttendedParticipantsOnly')
    .addItem('2b. Generate PINs & Names for Manually Entered Teams', 'generatePINsForManualTeams')
    .addItem('2c. Auto-Pair ALL Registrations (Shuffle All)', 'pairParticipantsAndCreateTeams')
    .addSeparator()
    .addItem('3. Populate Sample 3-Round Questions', 'populateSampleQuestions')
    .addSeparator()
    .addItem('4. Sync Teams to Firebase', 'syncTeamsToFirebase')
    .addItem('5. Sync Questions to Firebase', 'syncQuestionsToFirebase')
    .addSeparator()
    .addItem('Export All as JSON for FunQuiz App', 'exportDataAsJSON')
    .addToUi();
}

/**
 * 1. Setup all required sheets with Attendance Checkbox
 */
function setupSheetsTemplate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Form Responses Sheet
  let regSheet = ss.getSheetByName('Form Responses 1') || ss.getSheetByName('Registrations');
  if (!regSheet) {
    regSheet = ss.insertSheet('Registrations');
    regSheet.appendRow(['Timestamp', 'Full Name', 'Email Address', 'Phone Number', 'College / Department', 'Attended / Present']);
    regSheet.getRange('A1:F1').setFontWeight('bold').setBackground('#4338ca').setFontColor('#ffffff');
    // Sample registrations
    regSheet.appendRow([new Date(), 'Alex Rivera', 'alex@example.com', '9876543210', 'Computer Science', true]);
    regSheet.appendRow([new Date(), 'Samantha Chen', 'sam@example.com', '9876543211', 'Data Science', true]);
    regSheet.appendRow([new Date(), 'Marcus Johnson', 'marcus@example.com', '9876543212', 'Information Tech', true]);
    regSheet.appendRow([new Date(), 'Elena Rostova', 'elena@example.com', '9876543213', 'Design & Media', false]);
  } else {
    // If sheet exists, ensure Column F header is Attendance
    const lastCol = Math.max(regSheet.getLastColumn(), 6);
    const headers = regSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (!headers[5] || headers[5].toString().trim() === '') {
      regSheet.getRange(1, 6).setValue('Attended / Present').setFontWeight('bold').setBackground('#4338ca').setFontColor('#ffffff');
    }
  }

  // Insert checkboxes in Column F for attendance tracking
  const maxRows = Math.max(regSheet.getLastRow(), 15);
  if (maxRows >= 2) {
    regSheet.getRange(2, 6, maxRows - 1, 1).insertCheckboxes();
  }

  // 2. Teams Sheet
  let teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) {
    teamSheet = ss.insertSheet('Teams');
  }
  if (teamSheet.getLastRow() === 0) {
    teamSheet.appendRow(['Team ID', 'Team Name', 'Passcode (PIN)', 'Player 1 Name', 'Player 1 Email', 'Player 2 Name', 'Player 2 Email', 'Score', 'Status']);
    teamSheet.getRange('A1:I1').setFontWeight('bold').setBackground('#065f46').setFontColor('#ffffff');
  }

  // 3. Questions Sheet
  let qSheet = ss.getSheetByName('Questions');
  if (!qSheet) {
    qSheet = ss.insertSheet('Questions');
  }
  if (qSheet.getLastRow() === 0) {
    qSheet.appendRow(['Round (1-3)', 'Question No (1-5)', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option (A/B/C/D)', 'Points', 'Time Limit (Sec)']);
    qSheet.getRange('A1:J1').setFontWeight('bold').setBackground('#7c2d12').setFontColor('#ffffff');
  }

  SpreadsheetApp.getUi().alert('✅ Template initialized!\n• Check the "Attended / Present" checkboxes on the Registrations sheet.\n• Or manually write Player 1 & Player 2 on the "Teams" sheet and click "Generate PINs & Names".');
}

/**
 * 2a. Auto-Pair ONLY Present / Attended Participants
 * Pairs only the participants who have the "Attended / Present" checkbox checked (Column F)
 */
function pairAttendedParticipantsOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let regSheet = ss.getSheetByName('Form Responses 1') || ss.getSheetByName('Registrations');
  if (!regSheet) {
    SpreadsheetApp.getUi().alert('❌ Could not find "Form Responses 1" or "Registrations" sheet.');
    return;
  }

  const data = regSheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('⚠️ No registrations found in sheet.');
    return;
  }

  // Filter ONLY attended participants (Column F = index 5)
  const attended = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = String(row[1] || '').trim();
    const email = String(row[2] || '').trim();
    const isPresent = row[5] === true || String(row[5]).toUpperCase() === 'TRUE' || String(row[5]).toUpperCase() === 'YES';
    if (name && isPresent) {
      attended.push({ name: name, email: email, rowIdx: i });
    }
  }

  if (attended.length === 0) {
    SpreadsheetApp.getUi().alert('⚠️ No participants are marked as "Attended / Present" in Column F.\n\nPlease tick the checkboxes in Column F of the Registrations sheet for attendees present at the venue.');
    return;
  }

  // Fisher-Yates random shuffle among attended participants
  for (let i = attended.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [attended[i], attended[j]] = [attended[j], attended[i]];
  }

  const teamNames = generateFunTeamNames(Math.ceil(attended.length / 2) + 20);
  let teamSheet = ss.getSheetByName('Teams') || ss.insertSheet('Teams');
  teamSheet.clear();
  teamSheet.appendRow(['Team ID', 'Team Name', 'Passcode (PIN)', 'Player 1 Name', 'Player 1 Email', 'Player 2 Name', 'Player 2 Email', 'Score', 'Status']);
  teamSheet.getRange('A1:I1').setFontWeight('bold').setBackground('#065f46').setFontColor('#ffffff');

  const rows = [];
  let teamCount = 1;

  for (let i = 0; i < attended.length; i += 2) {
    const p1 = attended[i];
    const p2 = attended[i + 1] || { name: 'Solo Gladiator', email: '-' };
    const teamId = 'TEAM_' + ('00' + teamCount).slice(-3);
    const teamName = teamNames[teamCount - 1] || ('Galaxy Champion ' + teamCount);
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    rows.push([
      teamId,
      teamName,
      pin,
      p1.name,
      p1.email,
      p2.name,
      p2.email,
      0,
      'READY'
    ]);
    teamCount++;
  }

  if (rows.length > 0) {
    teamSheet.getRange(2, 1, rows.length, 9).setValues(rows);
    teamSheet.autoResizeColumns(1, 9);
  }

  SpreadsheetApp.getUi().alert(`🎉 Successfully paired ${attended.length} ATTENDED participants into ${rows.length} Teams!\n\nAll absent registrants were safely excluded.`);
}

/**
 * 2b. Generate PINs, IDs & Names for Manually Entered Teams
 * Use this when you manually type or paste Player 1 & Player 2 pairs into the "Teams" sheet!
 * It preserves your manual pairs and fills in unique fun team names & 6-digit PINs.
 */
function generatePINsForManualTeams() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) {
    SpreadsheetApp.getUi().alert('❌ "Teams" sheet not found! Please run "1. Initialize Sheets Template" first.');
    return;
  }

  const data = teamSheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('⚠️ The "Teams" sheet is empty!\n\nPlease write or paste Player 1 (Col D) and Player 2 (Col F) for your manual pairs, then run this again.');
    return;
  }

  const namePool = generateFunTeamNames(data.length + 30);
  let updatedCount = 0;
  let nextTeamNum = 1;

  // Collect existing IDs to avoid duplicates
  for (let i = 1; i < data.length; i++) {
    const match = String(data[i][0]).match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num >= nextTeamNum) nextTeamNum = num + 1;
    }
  }

  for (let i = 1; i < data.length; i++) {
    const p1 = String(data[i][3] || '').trim();
    const p2 = String(data[i][5] || '').trim();

    // If there is at least one player name in this row
    if (p1 || p2) {
      // 1. Team ID (Col A, index 0)
      if (!data[i][0] || String(data[i][0]).trim() === '') {
        data[i][0] = 'TEAM_' + ('00' + nextTeamNum).slice(-3);
        nextTeamNum++;
      }

      // 2. Team Name (Col B, index 1)
      if (!data[i][1] || String(data[i][1]).trim() === '') {
        data[i][1] = namePool[i - 1] || ('Cosmic Squad ' + i);
      }

      // 3. Passcode PIN (Col C, index 2) - 6 digits
      if (!data[i][2] || String(data[i][2]).trim().length !== 6) {
        data[i][2] = Math.floor(100000 + Math.random() * 900000).toString();
      }

      // 4. Default Score (Col H, index 7)
      if (data[i][7] === '' || data[i][7] === undefined) {
        data[i][7] = 0;
      }

      // 5. Default Status (Col I, index 8)
      if (!data[i][8]) {
        data[i][8] = 'READY';
      }

      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    teamSheet.getRange(1, 1, data.length, 9).setValues(data);
    teamSheet.autoResizeColumns(1, 9);
    SpreadsheetApp.getUi().alert(`🎉 Generated Passcodes (PINs) and Names for ${updatedCount} manually entered teams!\n\nYour manual pairs were preserved.`);
  } else {
    SpreadsheetApp.getUi().alert('⚠️ No rows with Player Names found in Columns D or F.');
  }
}

/**
 * 2c. Automatic Random Pairing of ALL Registrations (ignoring attendance)
 */
function pairParticipantsAndCreateTeams() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let regSheet = ss.getSheetByName('Form Responses 1') || ss.getSheetByName('Registrations');
  if (!regSheet) {
    SpreadsheetApp.getUi().alert('❌ Could not find "Form Responses 1" or "Registrations" sheet.');
    return;
  }

  const data = regSheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('⚠️ No participants found! Please wait for registrations or add rows.');
    return;
  }

  // Filter valid participants (Row 2 onwards)
  const participants = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = String(row[1] || '').trim();
    const email = String(row[2] || '').trim();
    if (name) {
      participants.push({ name: name, email: email, rowIdx: i });
    }
  }

  if (participants.length === 0) {
    SpreadsheetApp.getUi().alert('⚠️ No valid participant names found.');
    return;
  }

  // Fisher-Yates random shuffle
  for (let i = participants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }

  // Generate unique fun team names
  const teamNames = generateFunTeamNames(Math.ceil(participants.length / 2) + 20);

  let teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) {
    teamSheet = ss.insertSheet('Teams');
  }
  teamSheet.clear();
  teamSheet.appendRow(['Team ID', 'Team Name', 'Passcode (PIN)', 'Player 1 Name', 'Player 1 Email', 'Player 2 Name', 'Player 2 Email', 'Score', 'Status']);
  teamSheet.getRange('A1:I1').setFontWeight('bold').setBackground('#065f46').setFontColor('#ffffff');

  const rows = [];
  let teamCount = 1;

  for (let i = 0; i < participants.length; i += 2) {
    const p1 = participants[i];
    const p2 = participants[i + 1] || { name: 'Solo Gladiator', email: '-' }; // In case odd count
    const teamId = 'TEAM_' + ('00' + teamCount).slice(-3);
    const teamName = teamNames[teamCount - 1] || ('Galaxy Champion ' + teamCount);
    // 6-digit random numeric PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    rows.push([
      teamId,
      teamName,
      pin,
      p1.name,
      p1.email,
      p2.name,
      p2.email,
      0,
      'READY'
    ]);
    teamCount++;
  }

  if (rows.length > 0) {
    teamSheet.getRange(2, 1, rows.length, 9).setValues(rows);
    teamSheet.autoResizeColumns(1, 9);
  }

  SpreadsheetApp.getUi().alert(`🎉 Paired ${participants.length} participants into ${rows.length} Teams!\nCheck the "Teams" sheet for Login Team Names and 6-digit Passcodes.`);
}

/**
 * 3. Populate Curated 3-Round Fun Quiz Questions
 */
function populateSampleQuestions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let qSheet = ss.getSheetByName('Questions');
  if (!qSheet) {
    qSheet = ss.insertSheet('Questions');
  }
  qSheet.clear();
  qSheet.appendRow(['Round (1-3)', 'Question No (1-5)', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option (A/B/C/D)', 'Points', 'Time Limit (Sec)']);
  qSheet.getRange('A1:J1').setFontWeight('bold').setBackground('#7c2d12').setFontColor('#ffffff');

  const questions = [
    // ROUND 1: POP CULTURE & BRAIN TICKLERS (Warmup)
    [1, 1, "Which company originally developed the Android mobile operating system before Google bought it in 2005?", "Android Inc.", "Symbian", "Motorola", "Nokia", "A", 1000, 25],
    [1, 2, "In 'The Matrix', what color pill does Neo take to wake up in reality?", "Blue", "Red", "Green", "Yellow", "B", 1000, 20],
    [1, 3, "What does the 'HTTP' 418 status code stand for?", "I'm a teapot", "Payment Required", "Bad Gateway", "Catastrophic Failure", "A", 1000, 20],
    [1, 4, "Which animal is officially the national animal of Scotland?", "Loch Ness Monster", "Red Stag", "Unicorn", "Golden Eagle", "C", 1000, 25],
    [1, 5, "What was Google's original name when Larry Page and Sergey Brin started building it?", "Googol", "BackRub", "PageRanker", "AlphaSearch", "B", 1000, 20],

    // ROUND 2: TECH, GAMING & WEIRD FACTS (Heat is On)
    [2, 1, "Which popular game featured the iconic 'Konami Code' (↑ ↑ ↓ ↓ ← → ← → B A) for the first time?", "Contra", "Gradius", "Castlevania", "Metal Gear", "B", 1200, 25],
    [2, 2, "What was the first item sold on eBay in 1995?", "A Broken Laser Pointer", "A Pez Dispenser", "A Vintage Watch", "A Nintendo NES", "A", 1200, 20],
    [2, 3, "In computer memory, what is half a byte (4 bits) officially called?", "A Crumb", "A Nibble", "A Morsel", "A Bitlet", "B", 1200, 20],
    [2, 4, "Which space telescope was launched on Christmas Day in 2021?", "Hubble", "Kepler", "James Webb", "Chandra", "C", 1200, 25],
    [2, 5, "If you could fold a standard piece of paper 42 times, how thick would it become?", "Height of Mount Everest", "Distance to the Moon", "Across the Pacific Ocean", "Height of Burj Khalifa", "B", 1200, 25],

    // ROUND 3: RAPID FIRE & HIGH STAKES (Finals)
    [3, 1, "Which programming language was nicknamed 'Oak' during its early development by James Gosling?", "Python", "Java", "Ruby", "C++", "B", 1500, 20],
    [3, 2, "What color are airplane black boxes in reality so searchers can spot them?", "Jet Black", "Bright Orange", "Neon Yellow", "Silver Chrome", "B", 1500, 15],
    [3, 3, "What is the only letter that does NOT appear in the periodic table of elements?", "J", "Q", "Z", "X", "A", 1500, 20],
    [3, 4, "Which mythical creature is the symbol and mascot of GitHub?", "Octocat", "CyberKraken", "GitDragon", "BugHunter", "A", 1500, 15],
    [3, 5, "What famous sound was composed by Brian Eno using an Apple Macintosh in 1994?", "Windows 95 Startup", "Nokia Ringtone", "PlayStation 1 Intro", "Intel Chime", "A", 1500, 20]
  ];

  qSheet.getRange(2, 1, questions.length, 10).setValues(questions);
  qSheet.autoResizeColumns(1, 10);
  SpreadsheetApp.getUi().alert('🚀 Populated 15 thrilling questions across 3 Rounds (5 questions each)!');
}

/**
 * 4. Sync Teams Directly to Firebase Realtime Database
 */
function syncTeamsToFirebase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) {
    SpreadsheetApp.getUi().alert('❌ "Teams" sheet not found! Please run step 2 first.');
    return;
  }

  const data = teamSheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('⚠️ No teams found in "Teams" sheet.');
    return;
  }

  const teamsPayload = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const teamId = String(row[0]).trim();
    const teamName = String(row[1]).trim();
    const pin = String(row[2]).trim();
    const p1 = String(row[3]).trim();
    const p2 = String(row[5]).trim();

    if (teamName && pin) {
      teamsPayload[teamId] = {
        id: teamId,
        name: teamName,
        pin: pin,
        player1: p1,
        player2: p2,
        score: Number(row[7]) || 0,
        status: String(row[8] || 'READY'),
        currentStreak: 0,
        disqualified: false,
        lastAnswerTime: null
      };
    }
  }

  sendToFirebase('teams', teamsPayload);
}

/**
 * 5. Sync Questions to Firebase Realtime Database
 */
function syncQuestionsToFirebase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const qSheet = ss.getSheetByName('Questions');
  if (!qSheet) {
    SpreadsheetApp.getUi().alert('❌ "Questions" sheet not found!');
    return;
  }

  const data = qSheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert('⚠️ No questions found.');
    return;
  }

  const questionsPayload = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    questionsPayload.push({
      round: Number(r[0]),
      number: Number(r[1]),
      question: String(r[2]),
      options: {
        A: String(r[3]),
        B: String(r[4]),
        C: String(r[5]),
        D: String(r[6])
      },
      correct: String(r[7]).toUpperCase().trim(),
      points: Number(r[8]) || 1000,
      timeLimit: Number(r[9]) || 20
    });
  }

  sendToFirebase('questions', questionsPayload);
}

/**
 * Helper: Send JSON payload to Firebase Realtime Database
 */
function sendToFirebase(endpoint, data) {
  let dbUrl = FIREBASE_DB_URL.trim();
  if (!dbUrl || dbUrl.includes('YOUR_PROJECT_ID')) {
    const ui = SpreadsheetApp.getUi();
    const prompt = ui.prompt('Firebase Realtime Database URL', 'Enter your Firebase Realtime DB URL (e.g. https://xyz-default-rtdb.firebaseio.com):', ui.ButtonSet.OK_CANCEL);
    if (prompt.getSelectedButton() !== ui.Button.OK) return;
    dbUrl = prompt.getResponseText().trim();
  }

  if (!dbUrl.endsWith('/')) dbUrl += '/';
  let url = `${dbUrl}${endpoint}.json`;
  if (FIREBASE_AUTH_SECRET) {
    url += `?auth=${FIREBASE_AUTH_SECRET}`;
  }

  try {
    const options = {
      method: 'put',
      contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      SpreadsheetApp.getUi().alert(`✅ Successfully synced ${endpoint} to Firebase Realtime Database!`);
    } else {
      SpreadsheetApp.getUi().alert(`⚠️ Firebase returned status code ${code}:\n${response.getContentText()}`);
    }
  } catch (err) {
    SpreadsheetApp.getUi().alert(`❌ Error syncing to Firebase:\n${err.message}`);
  }
}

/**
 * Export teams & questions as a JSON file downloadable or copied directly
 */
function exportDataAsJSON() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teamSheet = ss.getSheetByName('Teams');
  const qSheet = ss.getSheetByName('Questions');

  const teams = [];
  if (teamSheet) {
    const td = teamSheet.getDataRange().getValues();
    for (let i = 1; i < td.length; i++) {
      teams.push({
        id: td[i][0],
        name: td[i][1],
        pin: td[i][2],
        player1: td[i][3],
        player2: td[i][5]
      });
    }
  }

  const questions = [];
  if (qSheet) {
    const qd = qSheet.getDataRange().getValues();
    for (let i = 1; i < qd.length; i++) {
      questions.push({
        round: qd[i][0],
        number: qd[i][1],
        question: qd[i][2],
        options: { A: qd[i][3], B: qd[i][4], C: qd[i][5], D: qd[i][6] },
        correct: qd[i][7],
        points: qd[i][8],
        timeLimit: qd[i][9]
      });
    }
  }

  const exportObj = { teams, questions };
  const jsonStr = JSON.stringify(exportObj, null, 2);

  const html = HtmlService.createHtmlOutput(
    `<p>Copy this JSON directly into your FunQuiz Web App Admin panel or upload it:</p>
     <textarea style="width:100%;height:350px;font-family:monospace;font-size:12px;">${jsonStr}</textarea>`
  ).setWidth(600).setHeight(450);

  SpreadsheetApp.getUi().showModalDialog(html, '⚡ FunQuiz Export JSON');
}

/**
 * Serves as a REST API endpoint if deployed as a Web App
 */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter.action || 'all';

  if (action === 'teams') {
    return ContentService.createTextOutput(JSON.stringify(getTeamsList(ss)))
      .setMimeType(ContentService.MimeType.JSON);
  } else if (action === 'questions') {
    return ContentService.createTextOutput(JSON.stringify(getQuestionsList(ss)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    teams: getTeamsList(ss),
    questions: getQuestionsList(ss)
  })).setMimeType(ContentService.MimeType.JSON);
}

function getTeamsList(ss) {
  const teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) return [];
  const td = teamSheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < td.length; i++) {
    list.push({
      id: td[i][0],
      name: td[i][1],
      pin: td[i][2],
      player1: td[i][3],
      player2: td[i][5]
    });
  }
  return list;
}

function getQuestionsList(ss) {
  const qSheet = ss.getSheetByName('Questions');
  if (!qSheet) return [];
  const qd = qSheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < qd.length; i++) {
    list.push({
      round: qd[i][0],
      number: qd[i][1],
      question: qd[i][2],
      options: { A: qd[i][3], B: qd[i][4], C: qd[i][5], D: qd[i][6] },
      correct: qd[i][7],
      points: qd[i][8],
      timeLimit: qd[i][9]
    });
  }
  return list;
}

/**
 * Funky & Epic Team Names Generator
 */
function generateFunTeamNames(count) {
  const prefixes = [
    'Cyber', 'Quantum', 'Galactic', 'Neon', 'Turbo', 'Cosmic', 'Pixel', 'Sonic',
    'Atomic', 'Vortex', 'Hyper', 'Stealth', 'Glitch', 'Binary', 'Shadow', 'Retro',
    'Laser', 'Astro', 'Mega', 'Thunder', 'Solar', 'Infinity', 'Electric', 'Phantom',
    'Matrix', 'Omega', 'Chrono', 'Velocity', 'Apex', 'Titan', 'Zenith', 'Prism'
  ];

  const suffixes = [
    'Ninjas', 'Wizards', 'Panthers', 'Hackers', 'Otters', 'Dragons', 'Falcons', 'Titans',
    'Cyborgs', 'Gladiators', 'Cobras', 'Cheetahs', 'Goblins', 'Captains', 'Raptors', 'Vipers',
    'Raiders', 'Wolves', 'Foxes', 'Phoenixes', 'Samurais', 'Crusaders', 'Pirates', 'Nomads',
    'Sharks', 'Bears', 'Pumas', 'Knights', 'Sparks', 'Mavericks', 'Legends', 'Warriors'
  ];

  const pool = [];
  for (const p of prefixes) {
    for (const s of suffixes) {
      pool.push(`${p} ${s}`);
    }
  }

  // Shuffle pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}
