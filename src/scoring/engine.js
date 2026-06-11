// src/scoring/engine.js — QF-anchored scoring system
//
// The 8 QF picks are the anchor. Scoring works as follows:
//
// PARTICIPATION: +5 (just for submitting)
//
// PHASE 1 — Group stage bonus (per QF pick):
//   +3 per group win, +1 per group draw
//
// PHASE 2 — Knockout (cumulative per correct team):
//   QF reached:    +5  (max +40 across 8 teams)
//   SF reached:    +8  (max +32 across 4 teams)
//   Final reached: +12 (max +24 across 2 teams)
//   Winner:        +20 (max +20)
//   3rd place:     +8  (max +8)
//   KO win bonus:  +5 per knockout win
//
// NEGATIVE (when a pick is eliminated before prediction):
//   Role:         grp  r32  r16   qf   sf  final
//   Picked as QF: [-3, -2,  -2,    0,   0,   0]
//   Picked as SF: [-4, -3,  -3,   -2,   0,   0]
//   Finalist:     [-5, -4,  -4,   -3,  -1,   0]
//   Winner:       [-6, -5,  -5,   -4,  -2,  -1]

import {
  R16_MATCHES, QF_MATCHES, SF_MATCHES, FINAL_MATCH,
} from '../data/bracket.js';

// ── STAGE RANK ────────────────────────────────────────────────
const STAGE_RANK = {
  'Group Stage':    0,
  'Round of 32':    1,
  'Round of 16':    2,
  'Quarter-finals': 3,
  'Semi-finals':    4,
  'Final':          5,
  'Winner':         6,
  'Third':          5,
};

// ── NEGATIVE MATRIX ───────────────────────────────────────────
// Columns: [grp, r32/r16, r16, qf, sf, final]
const NEG = Object.freeze({
  qf:     [-3, -2, -2,  0,  0,  0],
  sf:     [-4, -3, -3, -2,  0,  0],
  final:  [-5, -4, -4, -3, -1,  0],
  winner: [-6, -5, -5, -4, -2, -1],
});

const ELIM_IDX = {
  'Group Stage':    0,
  'Round of 32':    1,
  'Round of 16':    2,
  'Quarter-finals': 3,
  'Semi-finals':    4,
  'Final':          5,
};

// ── GET PICK ROLES ────────────────────────────────────────────
// Returns the 8 QF picks with their roles (qf/sf/final/winner)
// based on how deep the user predicted each team to go.
export const getPickRoles = (pick) => {
  const bp = pick.bracketPicks;
  if (!bp) return [];

  // All 8 QF picks start as role 'qf'
  const qfTeams = Object.values(bp.r16 || {}).filter(Boolean);
  const roles   = qfTeams.map(team => ({ team, role: 'qf' }));

  // Upgrade to 'sf' if in SF picks
  const sfTeams = Object.values(bp.sf || {}).filter(Boolean);
  // SF teams come from QF picks — upgrade role
  Object.values(bp.qf || {}).filter(Boolean).forEach(team => {
    if (sfTeams.includes(team)) {
      const r = roles.find(x => x.team === team);
      if (r) r.role = 'sf';
    }
  });

  // Upgrade to 'final' if in Final picks
  const sf1 = bp.sf?.['m101'];
  const sf2 = bp.sf?.['m102'];
  [sf1, sf2].filter(Boolean).forEach(team => {
    const r = roles.find(x => x.team === team);
    if (r) r.role = 'final';
  });

  // Upgrade to 'winner' if picked as champion
  const winner = bp.final?.['m104'];
  if (winner) {
    const r = roles.find(x => x.team === winner);
    if (r) r.role = 'winner';
  }

  return roles;
};

// ── GROUP STAGE SCORE ─────────────────────────────────────────
export const calcGroupScore = (pick, matchResults) => {
  if (!pick.bracketPicks || !matchResults) return 0;
  let pts = 0;
  const qfTeams = Object.values(pick.bracketPicks.r16 || {}).filter(Boolean);
  qfTeams.forEach(team => {
    const m = matchResults[team];
    if (!m) return;
    pts += (m.groupWins  || 0) * 3;
    pts += (m.groupDraws || 0) * 1;
  });
  return pts;
};

// ── KO WIN BONUS ─────────────────────────────────────────────
const calcKOWinBonus = (pick, matchResults) => {
  if (!pick.bracketPicks || !matchResults) return 0;
  let pts = 0;
  const qfTeams = Object.values(pick.bracketPicks.r16 || {}).filter(Boolean);
  qfTeams.forEach(team => {
    const m = matchResults[team];
    if (!m) return;
    pts += (m.koWins || 0) * 5;
  });
  return pts;
};

// ── ANTI-TROLL PENALTY ────────────────────────────────────────
export const calcPenalty = (pick, teamStatus) => {
  if (!pick.bracketPicks || !teamStatus) return 0;
  let pts = 0;
  const roles = getPickRoles(pick);

  roles.forEach(({ team, role }) => {
    const s = teamStatus[team];
    if (!s?.eliminatedAt) return;
    const elimIdx = ELIM_IDX[s.eliminatedAt];
    if (elimIdx === undefined) return;
    const predRank = { qf: 3, sf: 4, final: 5, winner: 6 }[role];
    if (STAGE_RANK[s.eliminatedAt] < predRank) {
      pts += NEG[role][elimIdx];
    }
  });

  return pts;
};

// ── BRACKET SCORE ─────────────────────────────────────────────
export const calcBracketScore = (pick, teamStatus) => {
  if (!pick.bracketPicks || !teamStatus) return 0;
  let pts = 0;
  const bp    = pick.bracketPicks;
  const roles = getPickRoles(pick);

  // QF: +5 per team that actually reached QF
  roles.forEach(({ team }) => {
    const rank = STAGE_RANK[teamStatus[team]?.reachedStage] ?? 0;
    if (rank >= STAGE_RANK['Quarter-finals']) pts += 5;
  });

  // SF: +8 per team that actually reached SF
  Object.values(bp.qf || {}).filter(Boolean).forEach(team => {
    const rank = STAGE_RANK[teamStatus[team]?.reachedStage] ?? 0;
    if (rank >= STAGE_RANK['Semi-finals']) pts += 8;
  });

  // Final: +12 per team that actually reached Final
  Object.values(bp.sf || {}).filter(Boolean).forEach(team => {
    const rank = STAGE_RANK[teamStatus[team]?.reachedStage] ?? 0;
    if (rank >= STAGE_RANK['Final']) pts += 12;
  });

  // Winner: +20
  const winner = bp.final?.['m104'];
  if (winner && teamStatus[winner]?.reachedStage === 'Winner') pts += 20;

  // 3rd place: +8
  const third = bp.third?.['m103'];
  if (third && teamStatus[third]?.reachedStage === 'Third') pts += 8;

  return pts;
};

// ── TOTAL SCORE ───────────────────────────────────────────────
export const calcTotalScore = (pick, matchResults, teamStatus) => {
  return 5  // participation
    + calcGroupScore(pick, matchResults)
    + calcKOWinBonus(pick, matchResults)
    + calcBracketScore(pick, teamStatus)
    + calcPenalty(pick, teamStatus);
};

// ── SCORE BREAKDOWN (for profile page) ───────────────────────
export const buildScoreBreakdown = (pick, matchResults, teamStatus) => {
  const rows = [];
  const bp   = pick.bracketPicks || {};

  // Participation
  rows.push({ round: 'Participation', pts: 5, detail: [] });

  // Group stage
  if (matchResults && Object.keys(matchResults).length) {
    const qfTeams = Object.values(bp.r16 || {}).filter(Boolean);
    let gPts = 0;
    const detail = [];
    qfTeams.forEach(team => {
      const m = matchResults[team];
      if (!m) return;
      const pts = (m.groupWins || 0) * 3 + (m.groupDraws || 0);
      if (pts) { detail.push({ team, pts, note: `${m.groupWins}W ${m.groupDraws}D` }); }
      gPts += pts;
    });
    rows.push({ round: 'Group Stage Bonus', pts: gPts, detail });
  }

  // QF
  if (teamStatus) {
    const roles = getPickRoles(pick);
    let qfPts = 0;
    const qfDetail = [];
    roles.forEach(({ team }) => {
      const rank = STAGE_RANK[teamStatus[team]?.reachedStage] ?? 0;
      const pts  = rank >= STAGE_RANK['Quarter-finals'] ? 5 : 0;
      qfPts += pts;
      qfDetail.push({ team, pts });
    });
    rows.push({ round: 'Quarter-finals', pts: qfPts, detail: qfDetail });

    // SF
    let sfPts = 0;
    const sfDetail = [];
    Object.values(bp.qf || {}).filter(Boolean).forEach(team => {
      const rank = STAGE_RANK[teamStatus[team]?.reachedStage] ?? 0;
      const pts  = rank >= STAGE_RANK['Semi-finals'] ? 8 : 0;
      sfPts += pts;
      sfDetail.push({ team, pts });
    });
    rows.push({ round: 'Semi-finals', pts: sfPts, detail: sfDetail });

    // Final
    let fPts = 0;
    const fDetail = [];
    Object.values(bp.sf || {}).filter(Boolean).forEach(team => {
      const rank = STAGE_RANK[teamStatus[team]?.reachedStage] ?? 0;
      const pts  = rank >= STAGE_RANK['Final'] ? 12 : 0;
      fPts += pts;
      fDetail.push({ team, pts });
    });
    rows.push({ round: 'Final', pts: fPts, detail: fDetail });

    // Winner
    const winner = bp.final?.['m104'];
    if (winner) {
      const pts = teamStatus[winner]?.reachedStage === 'Winner' ? 20 : 0;
      rows.push({ round: 'Champion', pts, detail: [{ team: winner, pts }] });
    }

    // 3rd place
    const third = bp.third?.['m103'];
    if (third) {
      const pts = teamStatus[third]?.reachedStage === 'Third' ? 8 : 0;
      rows.push({ round: '3rd Place', pts, detail: [{ team: third, pts }] });
    }

    // KO win bonus
    if (matchResults) {
      const kwPts = calcKOWinBonus(pick, matchResults);
      if (kwPts) rows.push({ round: 'KO Win Bonuses', pts: kwPts, detail: [] });
    }

    // Penalties
    const pen = calcPenalty(pick, teamStatus);
    if (pen) rows.push({ round: 'Penalties', pts: pen, detail: [] });
  }

  return rows;
};

// ── COMPLETION CHECK ─────────────────────────────────────────
export const isPickComplete = (pick) => {
  if (!pick?.groupStandings) return false;
  if (Object.keys(pick.groupStandings).length < 12) return false;
  if (!pick.r32picks || Object.keys(pick.r32picks).length < 8) return false;
  if (!pick.bracketPicks?.final?.['m104']) return false;
  return true;
};
