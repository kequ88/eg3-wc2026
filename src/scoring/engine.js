// src/scoring/engine.js — COMPLETE REWRITE for bracket-based scoring
//
// PURE FUNCTIONS ONLY. Zero DOM, zero Firebase, zero side effects.
// Input: pick document + real match results → Output: points breakdown
//
// SCORING RULES:
//   Phase 1 — Group stage (daily engagement)
//     +3 per win for your picked 1st/2nd place teams
//     +1 per draw for your picked 1st/2nd place teams
//
//   Phase 2 — Knockout bracket
//     R32 skipped entirely (fair across all brackets)
//     R16 reached:  +2 per correct team (max 16 teams × 2 = +32)
//     QF reached:   +5 per correct team (max 8  teams × 5 = +40)
//     SF reached:   +8 per correct team (max 4  teams × 8 = +32)
//     Final reached:+12 per correct team (max 2 teams × 12 = +24)
//     Winner:       +20 (once)
//
//   Anti-troll penalties
//     Picked winner exits group stage:   -5
//     Picked finalist exits group stage: -4
//
//   Maximum possible: 292 pts (group bonuses + perfect bracket)

import {
  R16_MATCHES, QF_MATCHES, SF_MATCHES, FINAL_MATCH,
  computeR16Participants, computeQFParticipants,
  computeSFParticipants, computeFinalParticipants,
} from '../data/bracket.js';

// Points per knockout stage
const KO_PTS = Object.freeze({
  r16:   2,
  qf:    5,
  sf:    8,
  final: 12,
  winner: 20,
});

// ── GROUP STAGE SCORE ─────────────────────────────────────────
// matchResults shape (from openfootball parser):
//   { "Brazil": { groupWins:2, groupDraws:1, groupLosses:0, ... }, ... }
//
// pick.groupStandings shape:
//   { A: { first:"Brazil", second:"Scotland" }, ... }

export const calcGroupScore = (pick, matchResults) => {
  if (!pick.groupStandings || !matchResults) return 0;
  let pts = 0;

  Object.values(pick.groupStandings).forEach(({ first, second }) => {
    [first, second].forEach(team => {
      if (!team) return;
      const m = matchResults[team];
      if (!m) return;
      pts += (m.groupWins   || 0) * 3;
      pts += (m.groupDraws  || 0) * 1;
    });
  });

  return pts;
};

// ── ANTI-TROLL PENALTY ────────────────────────────────────────
// teamStatus shape: { "Brazil": { reachedStage:"Group Stage", eliminatedAt:"Group Stage" } }

export const calcPenalty = (pick, teamStatus) => {
  if (!pick.bracketPicks || !teamStatus) return 0;
  let pts = 0;

  const winner  = pick.bracketPicks.final?.['m104'];
  const finalists = Object.values(pick.bracketPicks.sf || {});

  // Winner penalty
  if (winner) {
    const s = teamStatus[winner];
    if (s?.eliminatedAt === 'Group Stage') pts -= 5;
  }

  // Finalist penalty (exclude winner to avoid double penalty)
  finalists.forEach(team => {
    if (!team || team === winner) return;
    const s = teamStatus[team];
    if (s?.eliminatedAt === 'Group Stage') pts -= 4;
  });

  return pts;
};

// ── BRACKET SCORE ─────────────────────────────────────────────
// Compares user's bracket picks against real team statuses.
// teamStatus: { "Brazil": { reachedStage: "Semi-finals", eliminatedAt: "Semi-finals" } }

const STAGE_RANK = {
  'Group Stage': 0,
  'Round of 32': 1,
  'Round of 16': 2,
  'Quarter-finals': 3,
  'Semi-finals': 4,
  'Final': 5,
  'Winner': 6,
  'Third': 5, // same rank as Final — reached the last 4
};

export const calcBracketScore = (pick, teamStatus) => {
  if (!pick.bracketPicks || !teamStatus) return 0;
  let pts = 0;
  const bp = pick.bracketPicks;

  // R16 — +2 per team that actually reached R16
  Object.values(bp.r16 || {}).forEach(team => {
    if (!team) return;
    const rank = STAGE_RANK[teamStatus[team]?.reachedStage] ?? 0;
    if (rank >= STAGE_RANK['Round of 16']) pts += KO_PTS.r16;
  });

  // QF — +5 per team that actually reached QF
  Object.values(bp.qf || {}).forEach(team => {
    if (!team) return;
    const rank = STAGE_RANK[teamStatus[team]?.reachedStage] ?? 0;
    if (rank >= STAGE_RANK['Quarter-finals']) pts += KO_PTS.qf;
  });

  // SF — +8 per team that actually reached SF
  Object.values(bp.sf || {}).forEach(team => {
    if (!team) return;
    const rank = STAGE_RANK[teamStatus[team]?.reachedStage] ?? 0;
    if (rank >= STAGE_RANK['Semi-finals']) pts += KO_PTS.sf;
  });

  // Final — +12 per finalist
  Object.values(bp.final || {}).forEach(team => {
    if (!team) return;
    const rank = STAGE_RANK[teamStatus[team]?.reachedStage] ?? 0;
    if (rank >= STAGE_RANK['Final']) pts += KO_PTS.final;
  });

  // Winner — +20
  const winner = bp.final?.['m104'];
  if (winner && teamStatus[winner]?.reachedStage === 'Winner') {
    pts += KO_PTS.winner;
  }

  // 3rd place — +8 if team actually finished 3rd
  const third = bp.third?.['m103'];
  if (third && teamStatus[third]?.reachedStage === 'Third') {
    pts += 8;
  }

  return pts;
};

// ── TOTAL SCORE ───────────────────────────────────────────────
export const calcTotalScore = (pick, matchResults, teamStatus) => {
  return (
    calcGroupScore(pick, matchResults) +
    calcBracketScore(pick, teamStatus) +
    calcPenalty(pick, teamStatus)
  );
};

// ── PER-ROUND BREAKDOWN ───────────────────────────────────────
// Returns array of { round, pts, detail } for the profile page.
export const buildScoreBreakdown = (pick, matchResults, teamStatus) => {
  const rows = [];

  // Group stage
  const gPts = calcGroupScore(pick, matchResults);
  if (matchResults && Object.keys(matchResults).length > 0) {
    const detail = [];
    Object.entries(pick.groupStandings || {}).forEach(([grp, { first, second }]) => {
      [first, second].forEach(team => {
        if (!team) return;
        const m = matchResults[team];
        if (!m) return;
        const pts = (m.groupWins || 0) * 3 + (m.groupDraws || 0);
        if (pts !== 0) detail.push({ team, pts, note: `${m.groupWins}W ${m.groupDraws}D` });
      });
    });
    rows.push({ round: 'Group Stage', pts: gPts, detail });
  }

  // Bracket rounds
  const bp = pick.bracketPicks || {};
  const rounds = [
    { key: 'r16',   label: 'Round of 16',    pts: KO_PTS.r16,   stageReq: 'Round of 16'    },
    { key: 'qf',    label: 'Quarter-finals',  pts: KO_PTS.qf,    stageReq: 'Quarter-finals'  },
    { key: 'sf',    label: 'Semi-finals',     pts: KO_PTS.sf,    stageReq: 'Semi-finals'     },
    { key: 'final', label: 'Final',           pts: KO_PTS.final, stageReq: 'Final'           },
  ];

  rounds.forEach(({ key, label, pts: ptsEach, stageReq }) => {
    const teams = Object.values(bp[key] || {}).filter(Boolean);
    if (!teams.length) return;
    let roundPts = 0;
    const detail = [];
    teams.forEach(team => {
      const rank = STAGE_RANK[teamStatus?.[team]?.reachedStage] ?? 0;
      const earned = rank >= STAGE_RANK[stageReq] ? ptsEach : 0;
      roundPts += earned;
      detail.push({ team, pts: earned });
    });
    rows.push({ round: label, pts: roundPts, detail });
  });

  // 3rd place bonus
  const third = bp.third?.['m103'];
  if (third && teamStatus) {
    const isThird = teamStatus[third]?.reachedStage === 'Third';
    rows.push({
      round: '3rd Place Match',
      pts: isThird ? 8 : 0,
      detail: [{ team: third, pts: isThird ? 8 : 0 }],
    });
  }

  // Winner bonus
  const winner = bp.final?.['m104'];
  if (winner && teamStatus) {
    const isChamp = teamStatus[winner]?.reachedStage === 'Winner';
    rows.push({
      round: 'Winner',
      pts: isChamp ? KO_PTS.winner : 0,
      detail: [{ team: winner, pts: isChamp ? KO_PTS.winner : 0 }],
    });
  }

  // Penalties
  const pen = calcPenalty(pick, teamStatus);
  if (pen !== 0) {
    rows.push({ round: 'Penalties', pts: pen, detail: [] });
  }

  return rows;
};

// ── COMPLETION CHECK ─────────────────────────────────────────
// Returns true if pick has all required fields filled.
export const isPickComplete = (pick) => {
  if (!pick?.groupStandings) return false;
  const groups = Object.keys(pick.groupStandings);
  if (groups.length < 12) return false;
  for (const g of groups) {
    if (!pick.groupStandings[g]?.first || !pick.groupStandings[g]?.second) return false;
  }
  if (!pick.r32picks || Object.keys(pick.r32picks).length < 8) return false;
  if (!pick.bracketPicks?.final?.['m104']) return false;
  return true;
};
