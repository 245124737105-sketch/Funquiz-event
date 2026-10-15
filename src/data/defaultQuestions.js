export const DEFAULT_QUESTIONS = [
  // ROUND 1: WARMUP & BRAIN TICKLERS
  {
    id: "r1_q1",
    round: 1,
    number: 1,
    question: "Which company originally developed the Android mobile operating system before Google acquired it in 2005?",
    options: {
      A: "Android Inc.",
      B: "Symbian Ltd.",
      C: "Motorola Mobility",
      D: "Nokia Bell Labs"
    },
    correct: "A",
    points: 1000,
    timeLimit: 20,
    funFact: "Android Inc. was founded in Palo Alto, California in October 2003 by Andy Rubin, Rich Miner, Nick Sears, and Chris White."
  },
  {
    id: "r1_q2",
    round: 1,
    number: 2,
    question: "In the 1999 movie 'The Matrix', which color pill does Morpheus offer Neo to learn the truth?",
    options: {
      A: "The Blue Pill",
      B: "The Red Pill",
      C: "The Green Pill",
      D: "The Golden Pill"
    },
    correct: "B",
    points: 1000,
    timeLimit: 20,
    funFact: "Taking the red pill represented facing the harsh truth, while the blue pill allowed remaining in blissful ignorance."
  },
  {
    id: "r1_q3",
    round: 1,
    number: 3,
    question: "What does the official HTTP status code 418 stand for?",
    options: {
      A: "I'm a teapot",
      B: "Payment Required",
      C: "Bad Gateway",
      D: "Catastrophic Quantum Leak"
    },
    correct: "A",
    points: 1000,
    timeLimit: 20,
    funFact: "Defined in 1998 as an April Fools' joke in RFC 2324 (Hyper Text Coffee Pot Control Protocol)."
  },
  {
    id: "r1_q4",
    round: 1,
    number: 4,
    question: "Which legendary mythical animal is the official national animal of Scotland?",
    options: {
      A: "Loch Ness Monster",
      B: "Griffin",
      C: "The Unicorn",
      D: "Dragon"
    },
    correct: "C",
    points: 1000,
    timeLimit: 20,
    funFact: "In Celtic mythology, the unicorn was a symbol of purity, innocence, masculinity, and untamable power."
  },
  {
    id: "r1_q5",
    round: 1,
    number: 5,
    question: "What was Google's original project search engine name when founded in 1996?",
    options: {
      A: "Googolplex",
      B: "BackRub",
      C: "PageRanker",
      D: "AlphaSearch"
    },
    correct: "B",
    points: 1000,
    timeLimit: 20,
    funFact: "Larry Page and Sergey Brin originally called it BackRub because the system analyzed web backlinks to estimate site importance."
  },

  // ROUND 2: TECH, GAMING & WEIRD TRIVIA
  {
    id: "r2_q1",
    round: 2,
    number: 1,
    question: "Which classic arcade video game introduced the legendary 'Konami Code' (↑ ↑ ↓ ↓ ← → ← → B A)?",
    options: {
      A: "Contra",
      B: "Gradius",
      C: "Castlevania",
      D: "Metal Gear"
    },
    correct: "B",
    points: 1200,
    timeLimit: 25,
    funFact: "Created by Kazuhisa Hashimoto in 1986 while porting the arcade game Gradius to the NES because it was too hard for him to play-test!"
  },
  {
    id: "r2_q2",
    round: 2,
    number: 2,
    question: "What was the very first item ever sold on eBay (then AuctionWeb) in 1995?",
    options: {
      A: "A Broken Laser Pointer",
      B: "A Vintage Pez Dispenser",
      C: "A Macintosh SE Computer",
      D: "A Michael Jordan Rookie Card"
    },
    correct: "A",
    points: 1200,
    timeLimit: 20,
    funFact: "Founder Pierre Omidyar sold it for $14.83. Astounded, he messaged the buyer asking if he knew it was broken. The buyer replied: 'I collect broken laser pointers.'"
  },
  {
    id: "r2_q3",
    round: 2,
    number: 3,
    question: "In computer science, what is a 4-bit unit of digital information (half of a byte) called?",
    options: {
      A: "Crumb",
      B: "Nibble (or Nybble)",
      C: "Morsel",
      D: "Chomp"
    },
    correct: "B",
    points: 1200,
    timeLimit: 20,
    funFact: "Two nibbles make one byte! 2 bits is also occasionally called a 'crumb'."
  },
  {
    id: "r2_q4",
    round: 2,
    number: 4,
    question: "Which space telescope was launched on Christmas Day in 2021 to observe early galaxies?",
    options: {
      A: "Hubble Space Telescope",
      B: "Kepler Observatory",
      C: "James Webb Space Telescope",
      D: "Spitzer Space Telescope"
    },
    correct: "C",
    points: 1200,
    timeLimit: 25,
    funFact: "JWST operates at Lagrange point 2 (L2), nearly 1.5 million kilometers from Earth."
  },
  {
    id: "r2_q5",
    round: 2,
    number: 5,
    question: "If you could fold a standard sheet of paper in half 42 times, how thick would it be?",
    options: {
      A: "Height of Mount Everest",
      B: "Distance from Earth to the Moon",
      C: "Circumference of the Earth",
      D: "Height of the International Space Station"
    },
    correct: "B",
    points: 1200,
    timeLimit: 25,
    funFact: "Exponential growth! 0.1 mm x 2^42 ≈ 439,804 kilometers. The average distance to the moon is ~384,400 km."
  },

  // ROUND 3: RAPID FIRE & HIGH STAKES FINALS
  {
    id: "r3_q1",
    round: 3,
    number: 1,
    question: "Which ubiquitous programming language was nicknamed 'Oak' during early development by James Gosling?",
    options: {
      A: "Python",
      B: "Java",
      C: "Ruby",
      D: "C++"
    },
    correct: "B",
    points: 1500,
    timeLimit: 15,
    funFact: "Gosling named it Oak after an oak tree that stood outside his office window at Sun Microsystems."
  },
  {
    id: "r3_q2",
    round: 3,
    number: 2,
    question: "What color are aircraft 'black boxes' (flight data recorders) painted in reality?",
    options: {
      A: "Matte Jet Black",
      B: "High-Visibility Bright Orange",
      C: "Electric Neon Yellow",
      D: "Fluorescent Red"
    },
    correct: "B",
    points: 1500,
    timeLimit: 15,
    funFact: "They are painted bright orange with reflective strips so search crews can spot wreckage on sea beds or forests."
  },
  {
    id: "r3_q3",
    round: 3,
    number: 3,
    question: "What is the only English alphabet letter that does NOT appear in the Periodic Table of Elements?",
    options: {
      A: "J",
      B: "Q",
      C: "Z",
      D: "X"
    },
    correct: "A",
    points: 1500,
    timeLimit: 15,
    funFact: "Letter 'J' does not appear anywhere in modern IUPAC element names or symbols!"
  },
  {
    id: "r3_q4",
    round: 3,
    number: 4,
    question: "What is the name of GitHub's famous cat-octopus mascot?",
    options: {
      A: "Octocat (Mona)",
      B: "GitKraken",
      C: "CyberClaw",
      D: "ByteKitten"
    },
    correct: "A",
    points: 1500,
    timeLimit: 15,
    funFact: "Her full official name is Mona Lisa the Octocat, created by Simon Oxley and designed by Cameron McEfee."
  },
  {
    id: "r3_q5",
    round: 3,
    number: 5,
    question: "Which legendary sound was composed by ambient pioneer Brian Eno on an Apple Macintosh in 1994?",
    options: {
      A: "Windows 95 Startup Chime",
      B: "Original PlayStation 1 Intro Sound",
      C: "Nokia Default Ringtone",
      D: "Intel Inside Bong Jingle"
    },
    correct: "A",
    points: 1500,
    timeLimit: 15,
    funFact: "Eno was commissioned to create a sound that was 'inspiring, sexy, universal, optimistic', under 3.25 seconds - and he ironically produced all 84 drafts on a Mac!"
  }
];
