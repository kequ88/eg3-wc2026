// src/data/bracket.js
//
// SINGLE SOURCE OF TRUTH for the entire WC2026 bracket structure.
// All match numbers are official FIFA match numbers (73–104).
//
// This file is the backbone of the entire prediction system.
// Every other module (UI, scoring, validation) imports from here.

// ── GROUP COMPOSITIONS ────────────────────────────────────────
// Teams in each group, in FIFA seeding order.
// Used to render the group stage selection UI.

export const GROUPS = Object.freeze({
  A: ['Mexico',        'South Africa', 'Korea Republic', 'Czechia'],
  B: ['Canada',        'Qatar',        'Switzerland',    'Bosnia & Herzegovina'],
  C: ['Brazil',        'Haiti',        'Scotland',       'Morocco'],
  D: ['United States', 'Türkiye',      'Australia',      'Paraguay'],
  E: ['Germany',       'Curaçao',      'Ivory Coast',    'Ecuador'],
  F: ['Netherlands',   'Tunisia',      'Japan',          'Sweden'],
  G: ['Belgium',       'Iran',         'New Zealand',    'Egypt'],
  H: ['Spain',         'Saudi Arabia', 'Uruguay',        'Cabo Verde'],
  I: ['France',        'Iraq',         'Norway',         'Senegal'],
  J: ['Argentina',     'Jordan',       'Algeria',        'Ecuador'],
  K: ['Portugal',      'Uzbekistan',   'Colombia',       'DR Congo'],
  L: ['England',       'Panama',       'Croatia',        'Ghana'],
});

export const GROUP_NAMES = Object.keys(GROUPS); // ['A','B',...,'L']

// ── ROUND OF 32 MATCH DEFINITIONS ────────────────────────────
// Official FIFA matches 73–88.
//
// type:
//   'vs2nd'     → two runners-up play each other (must click)
//   '1stVs2nd'  → group winner vs another group's runner-up (must click)
//   'walkover'  → group winner vs 3rd-place qualifier (auto-advance winner)
//
// For walkover matches, the user's chosen 1st-place team advances
// automatically. We never ask who the 3rd place opponent is.
//
// slotA / slotB describe which group position fills each side.

export const R32_MATCHES = Object.freeze([
  // ── MUST CLICK (8 matches) ────────────────────────────────
  {
    id: 'm73',  num: 73,  type: 'vs2nd',
    slotA: { group: 'A', pos: 'second' },
    slotB: { group: 'B', pos: 'second' },
    date: 'Sun 28 Jun',
  },
  {
    id: 'm75',  num: 75,  type: '1stVs2nd',
    slotA: { group: 'F', pos: 'first'  },
    slotB: { group: 'C', pos: 'second' },
    date: 'Mon 29 Jun',
  },
  {
    id: 'm76',  num: 76,  type: '1stVs2nd',
    slotA: { group: 'C', pos: 'first'  },
    slotB: { group: 'F', pos: 'second' },
    date: 'Mon 29 Jun',
  },
  {
    id: 'm78',  num: 78,  type: 'vs2nd',
    slotA: { group: 'E', pos: 'second' },
    slotB: { group: 'I', pos: 'second' },
    date: 'Tue 30 Jun',
  },
  {
    id: 'm83',  num: 83,  type: 'vs2nd',
    slotA: { group: 'K', pos: 'second' },
    slotB: { group: 'L', pos: 'second' },
    date: 'Thu 2 Jul',
  },
  {
    id: 'm84',  num: 84,  type: '1stVs2nd',
    slotA: { group: 'H', pos: 'first'  },
    slotB: { group: 'J', pos: 'second' },
    date: 'Thu 2 Jul',
  },
  {
    id: 'm86',  num: 86,  type: '1stVs2nd',
    slotA: { group: 'J', pos: 'first'  },
    slotB: { group: 'H', pos: 'second' },
    date: 'Fri 3 Jul',
  },
  {
    id: 'm88',  num: 88,  type: 'vs2nd',
    slotA: { group: 'D', pos: 'second' },
    slotB: { group: 'G', pos: 'second' },
    date: 'Fri 3 Jul',
  },

  // ── WALKOVERS (8 matches) — 1st place auto-advances ──────
  {
    id: 'm74',  num: 74,  type: 'walkover',
    slotA: { group: 'E', pos: 'first' },
    slotB: null, // 3rd place ABCDF — not asked
    date: 'Mon 29 Jun',
  },
  {
    id: 'm77',  num: 77,  type: 'walkover',
    slotA: { group: 'I', pos: 'first' },
    slotB: null, // 3rd place CDFGH
    date: 'Tue 30 Jun',
  },
  {
    id: 'm79',  num: 79,  type: 'walkover',
    slotA: { group: 'A', pos: 'first' },
    slotB: null, // 3rd place CEFHI
    date: 'Tue 30 Jun',
  },
  {
    id: 'm80',  num: 80,  type: 'walkover',
    slotA: { group: 'L', pos: 'first' },
    slotB: null, // 3rd place EHIJK
    date: 'Wed 1 Jul',
  },
  {
    id: 'm81',  num: 81,  type: 'walkover',
    slotA: { group: 'D', pos: 'first' },
    slotB: null, // 3rd place BEFIJ
    date: 'Wed 1 Jul',
  },
  {
    id: 'm82',  num: 82,  type: 'walkover',
    slotA: { group: 'G', pos: 'first' },
    slotB: null, // 3rd place AEHIJ
    date: 'Wed 1 Jul',
  },
  {
    id: 'm85',  num: 85,  type: 'walkover',
    slotA: { group: 'B', pos: 'first' },
    slotB: null, // 3rd place EFGIJ
    date: 'Thu 2 Jul',
  },
  {
    id: 'm87',  num: 87,  type: 'walkover',
    slotA: { group: 'K', pos: 'first' },
    slotB: null, // 3rd place DEIJL
    date: 'Fri 3 Jul',
  },
]);

// Quick lookup: match id → match definition
export const R32_BY_ID = Object.freeze(
  Object.fromEntries(R32_MATCHES.map(m => [m.id, m]))
);

// Only the 8 clickable (non-walkover) matches
export const R32_CLICKABLE = Object.freeze(
  R32_MATCHES.filter(m => m.type !== 'walkover')
);

// ── ROUND OF 16 MATCH DEFINITIONS ────────────────────────────
// Each R16 match is defined by which two R32 match winners play.
// Official FIFA matches 89–96.

export const R16_MATCHES = Object.freeze([
  { id: 'm89', num: 89, feedsFrom: ['m74', 'm77'], date: 'Sat 4 Jul'  },
  { id: 'm90', num: 90, feedsFrom: ['m73', 'm75'], date: 'Sat 4 Jul'  },
  { id: 'm91', num: 91, feedsFrom: ['m76', 'm78'], date: 'Sun 5 Jul'  },
  { id: 'm92', num: 92, feedsFrom: ['m79', 'm80'], date: 'Sun 5 Jul'  },
  { id: 'm93', num: 93, feedsFrom: ['m83', 'm84'], date: 'Mon 6 Jul'  },
  { id: 'm94', num: 94, feedsFrom: ['m81', 'm82'], date: 'Mon 6 Jul'  },
  { id: 'm95', num: 95, feedsFrom: ['m86', 'm88'], date: 'Tue 7 Jul'  },
  { id: 'm96', num: 96, feedsFrom: ['m85', 'm87'], date: 'Tue 7 Jul'  },
]);

// ── QUARTER-FINAL MATCH DEFINITIONS ──────────────────────────
// Official FIFA matches 97–100.

export const QF_MATCHES = Object.freeze([
  { id: 'm97',  num: 97,  feedsFrom: ['m89', 'm90'], date: 'Thu 9 Jul'  },
  { id: 'm98',  num: 98,  feedsFrom: ['m93', 'm94'], date: 'Fri 10 Jul' },
  { id: 'm99',  num: 99,  feedsFrom: ['m91', 'm92'], date: 'Sat 11 Jul' },
  { id: 'm100', num: 100, feedsFrom: ['m95', 'm96'], date: 'Sat 11 Jul' },
]);

// ── SEMI-FINAL MATCH DEFINITIONS ─────────────────────────────
// Official FIFA matches 101–102.

export const SF_MATCHES = Object.freeze([
  { id: 'm101', num: 101, feedsFrom: ['m97',  'm98'],  date: 'Tue 14 Jul' },
  { id: 'm102', num: 102, feedsFrom: ['m99',  'm100'], date: 'Wed 15 Jul' },
]);

// ── FINAL ────────────────────────────────────────────────────
export const FINAL_MATCH = Object.freeze(
  { id: 'm104', num: 104, feedsFrom: ['m101', 'm102'], date: 'Sun 19 Jul' }
);

// ── ALL KNOCKOUT ROUNDS IN ORDER ──────────────────────────────
// Useful for iterating through rounds in sequence.
export const KO_ROUNDS = Object.freeze([
  { key: 'r32',   label: 'Round of 32',    matches: R32_MATCHES   },
  { key: 'r16',   label: 'Round of 16',    matches: R16_MATCHES   },
  { key: 'qf',    label: 'Quarter-finals', matches: QF_MATCHES    },
  { key: 'sf',    label: 'Semi-finals',    matches: SF_MATCHES    },
  { key: 'final', label: 'Final',          matches: [FINAL_MATCH] },
]);

// ── HELPER: resolve which team fills a bracket slot ──────────
// Given groupStandings and r32picks, compute which team is in
// any given R32 slot. Used by the bracket UI to know what to show.
//
// Returns team name string or null if not yet picked.
export const resolveR32Slot = (matchId, groupStandings, r32picks) => {
  const match = R32_BY_ID[matchId];
  if (!match) return null;

  if (match.type === 'walkover') {
    // Auto-advance the 1st place team
    return groupStandings[match.slotA.group]?.first ?? null;
  }

  // For clickable matches, return the picked winner if exists
  // But first resolve what teams are available in this match
  return r32picks?.[matchId] ?? null;
};

// ── HELPER: get the two competing teams for a clickable R32 match
// Returns { teamA, teamB } — both may be null if groups not filled yet.
export const getR32Teams = (matchId, groupStandings) => {
  const match = R32_BY_ID[matchId];
  if (!match || match.type === 'walkover') return { teamA: null, teamB: null };

  const teamA = groupStandings[match.slotA.group]?.[match.slotA.pos] ?? null;
  const teamB = groupStandings[match.slotB.group]?.[match.slotB.pos] ?? null;
  return { teamA, teamB };
};

// ── HELPER: compute full R16 participants from standings + r32picks
// Returns { m89: "Germany", m90: "Brazil", ... } or null for incomplete slots
export const computeR16Participants = (groupStandings, r32picks) => {
  const result = {};
  R16_MATCHES.forEach(match => {
    const [srcA, srcB] = match.feedsFrom;
    const teamA = resolveR32Slot(srcA, groupStandings, r32picks);
    const teamB = resolveR32Slot(srcB, groupStandings, r32picks);
    result[match.id] = { teamA, teamB };
  });
  return result;
};

// ── HELPER: compute QF participants from r16picks
export const computeQFParticipants = (r16Participants, r16picks) => {
  const result = {};
  QF_MATCHES.forEach(match => {
    const [srcA, srcB] = match.feedsFrom;
    const teamA = r16picks?.[srcA] ?? null;
    const teamB = r16picks?.[srcB] ?? null;
    result[match.id] = { teamA, teamB };
  });
  return result;
};

// ── HELPER: compute SF participants from qfpicks
export const computeSFParticipants = (qfpicks) => {
  const result = {};
  SF_MATCHES.forEach(match => {
    const [srcA, srcB] = match.feedsFrom;
    const teamA = qfpicks?.[srcA] ?? null;
    const teamB = qfpicks?.[srcB] ?? null;
    result[match.id] = { teamA, teamB };
  });
  return result;
};

// ── HELPER: compute Final participants from sfpicks
export const computeFinalParticipants = (sfpicks) => {
  const teamA = sfpicks?.['m101'] ?? null;
  const teamB = sfpicks?.['m102'] ?? null;
  return { teamA, teamB };
};

// ── PROGRESS STEPS ────────────────────────────────────────────
// The submission flow has 4 distinct steps.
// 'progress' field in Firestore tracks where the user last saved.
export const PROGRESS_STEPS = Object.freeze([
  'groups',   // Step 1: rank all 12 groups
  'r32',      // Step 2: pick winners of 8 clickable R32 matches
  'bracket',  // Step 3: pick R16 → QF → SF → Final
  'done',     // Submitted and locked
]);
