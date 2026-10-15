// Fun gamer & tech prefixes & suffixes for automatic team naming
export const TEAM_PREFIXES = [
  "Cyber", "Quantum", "Galactic", "Neon", "Turbo", "Cosmic", "Pixel", "Sonic",
  "Atomic", "Vortex", "Hyper", "Stealth", "Glitch", "Binary", "Shadow", "Retro",
  "Laser", "Astro", "Mega", "Thunder", "Solar", "Infinity", "Electric", "Phantom",
  "Matrix", "Omega", "Chrono", "Velocity", "Apex", "Titan", "Zenith", "Prism",
  "Dynamo", "Alpha", "Radiant", "Pulse", "Nova", "Flux", "Zero", "Storm"
];

export const TEAM_SUFFIXES = [
  "Ninjas", "Wizards", "Panthers", "Hackers", "Otters", "Dragons", "Falcons", "Titans",
  "Cyborgs", "Gladiators", "Cobras", "Cheetahs", "Goblins", "Captains", "Raptors", "Vipers",
  "Raiders", "Wolves", "Foxes", "Phoenixes", "Samurais", "Crusaders", "Pirates", "Nomads",
  "Sharks", "Bears", "Pumas", "Knights", "Sparks", "Mavericks", "Legends", "Warriors",
  "Titans", "Sentinels", "Gryphons", "Vagabonds", "Specters", "Blasters"
];

/**
 * Generates a unique, fun team name
 */
export function generateFunTeamName(existingNames = []) {
  const existingSet = new Set((existingNames || []).map(n => String(n).trim().toLowerCase()));
  
  for (let attempts = 0; attempts < 100; attempts++) {
    const prefix = TEAM_PREFIXES[Math.floor(Math.random() * TEAM_PREFIXES.length)];
    const suffix = TEAM_SUFFIXES[Math.floor(Math.random() * TEAM_SUFFIXES.length)];
    const name = `${prefix} ${suffix}`;
    if (!existingSet.has(name.toLowerCase())) {
      return name;
    }
  }
  return `Arena Champion ${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * Generates a random 6-digit numeric passcode
 */
export function generate6DigitPin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculates the next Team ID (e.g. TEAM_001, TEAM_002...)
 */
export function getNextTeamId(teamsMapOrArray) {
  const teams = Array.isArray(teamsMapOrArray) 
    ? teamsMapOrArray 
    : Object.values(teamsMapOrArray || {});
    
  let maxId = 0;
  teams.forEach(t => {
    if (t?.id && typeof t.id === "string") {
      const match = t.id.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxId) maxId = num;
      }
    }
  });

  const nextNum = maxId + 1;
  return `TEAM_${String(nextNum).padStart(3, "0")}`;
}
