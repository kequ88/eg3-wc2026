// src/ui/bracket.js
// Step 3: Progressive bracket tree — R16 → QF → SF → Final
// User clicks one team per match. Each round only shows teams
// that were picked in the previous round — physically impossible
// to pick a team that didn't advance.

import {
  R16_MATCHES, QF_MATCHES, SF_MATCHES, FINAL_MATCH,
  computeR16Participants, computeQFParticipants,
  computeSFParticipants, computeFinalParticipants,
} from '../data/bracket.js';
import { findTeam }  from '../data/teams.js';
import { autoSave }  from '../services/firestore.js';
import { Analytics } from '../services/analytics.js';

let bracketPicks   = { r16: {}, qf: {}, sf: {}, final: {} };
let groupStandings = {};
let r32picks       = {};
let currentHouseId = null;

// ── RENDER ────────────────────────────────────────────────────
export const renderBracketStep = (houseId, standings, r32p, existingPicks = {}) => {
  currentHouseId = houseId;
  groupStandings = standings;
  r32picks       = r32p;
  bracketPicks   = {
    r16:   { ...(existingPicks.r16   || {}) },
    qf:    { ...(existingPicks.qf    || {}) },
    sf:    { ...(existingPicks.sf    || {}) },
    final: { ...(existingPicks.final || {}) },
  };

  const el = document.getElementById('step-bracket');
  if (!el) return;

  el.innerHTML = `
    <div class="step-header">
      <div class="step-title">Step 3 of 3 — Build Your Bracket</div>
      <div class="step-sub">
        Click the team you think wins each match.
        Only teams from the previous round appear — the bracket locks itself.
      </div>
    </div>

    <div id="bracket-content">${buildAllRounds()}</div>

    <div class="btn-row" style="margin-top:16px">
      <button class="btn" onclick="App.bracketBack()"
        style="flex:0 0 auto;padding:10px 20px">← Back</button>
      <button class="btn primary" id="btn-bracket-submit"
        onclick="App.bracketSubmit()"
        ${bracketPicks.final?.['m104'] ? '' : 'disabled'}>
        Submit My Predictions 🏆
      </button>
    </div>
    <div class="msg" id="bracket-msg"></div>
  `;
};

// ── BUILD ALL ROUNDS ──────────────────────────────────────────
const buildAllRounds = () => {
  const r16p  = computeR16Participants(groupStandings, r32picks);
  const qfp   = computeQFParticipants(r16p, bracketPicks.r16);
  const sfp   = computeSFParticipants(bracketPicks.qf);
  const finp  = computeFinalParticipants(bracketPicks.sf);

  return `
    ${buildRound('Round of 16',    R16_MATCHES, r16p, 'r16')}
    ${buildRound('Quarter-finals', QF_MATCHES,  qfp,  'qf')}
    ${buildRound('Semi-finals',    SF_MATCHES,  sfp,  'sf')}
    ${buildFinalRound(finp)}
    ${buildWinnerDisplay()}
  `;
};

// ── BUILD A ROUND ─────────────────────────────────────────────
const buildRound = (label, matches, participants, roundKey) => {
  const cards = matches.map(match => {
    const { teamA, teamB } = participants[match.id] || {};
    const picked           = bracketPicks[roundKey]?.[match.id] || null;
    return buildMatchCard(match, teamA, teamB, picked, roundKey);
  }).join('');

  return `
    <div class="bracket-round">
      <div class="bracket-round-label">${label}</div>
      <div class="bracket-matches">${cards}</div>
    </div>`;
};

// ── BUILD FINAL ROUND ─────────────────────────────────────────
const buildFinalRound = ({ teamA, teamB }) => {
  const picked = bracketPicks.final?.['m104'] || null;
  const match  = { id: 'm104', num: 104, date: 'Sun 19 Jul' };
  const card   = buildMatchCard(match, teamA, teamB, picked, 'final');

  return `
    <div class="bracket-round bracket-final-round">
      <div class="bracket-round-label">🏆 The Final — 19 July, New York</div>
      <div class="bracket-matches">${card}</div>
    </div>`;
};

// ── WINNER DISPLAY ────────────────────────────────────────────
const buildWinnerDisplay = () => {
  const winner = bracketPicks.final?.['m104'];
  if (!winner) return `
    <div class="winner-display winner-empty">
      <div class="winner-trophy">🏆</div>
      <div class="winner-label">Pick your World Cup champion above</div>
    </div>`;

  const t = findTeam(winner) || { f: '🏳', n: winner };
  return `
    <div class="winner-display winner-selected">
      <div class="winner-trophy">🏆</div>
      <div class="winner-flag">${t.f}</div>
      <div class="winner-name">${winner}</div>
      <div class="winner-label">Your World Cup Champion</div>
    </div>`;
};

// ── MATCH CARD ────────────────────────────────────────────────
const buildMatchCard = (match, teamA, teamB, picked, roundKey) => {
  const isLocked = !teamA || !teamB; // previous round not complete

  const btnA = bracketTeamBtn(match.id, teamA, picked, roundKey, isLocked);
  const btnB = bracketTeamBtn(match.id, teamB, picked, roundKey, isLocked);

  return `
    <div class="bracket-match ${picked ? 'bracket-match-done' : ''} ${isLocked ? 'bracket-match-locked' : ''}"
      id="bracket-match-${match.id}">
      <div class="bracket-match-label">M${match.num} · ${match.date}</div>
      <div class="bracket-match-teams">
        ${btnA}
        <span class="vs-label">VS</span>
        ${btnB}
      </div>
    </div>`;
};

const bracketTeamBtn = (matchId, team, picked, roundKey, isLocked) => {
  if (!team) {
    return `<div class="bracket-team-btn bracket-team-tbd">
      <span class="r32-name">Awaiting pick…</span>
    </div>`;
  }
  const t          = findTeam(team) || { f: '🏳', n: team };
  const isSelected = picked === team;
  const isDimmed   = picked && picked !== team;

  return `
    <button class="bracket-team-btn
      ${isSelected ? ' bracket-selected' : ''}
      ${isDimmed   ? ' bracket-dimmed'   : ''}
      ${isLocked   ? ' bracket-locked'   : ''}"
      ${isLocked ? 'disabled' : ''}
      onclick="App.pickBracket('${roundKey}','${matchId}','${team}')">
      <span class="r32-flag">${t.f}</span>
      <span class="r32-name">${team}</span>
      ${isSelected ? '<span class="r32-tick">✓</span>' : ''}
    </button>`;
};

// ── PICK HANDLER ──────────────────────────────────────────────
export const pickBracket = (roundKey, matchId, team) => {
  if (!bracketPicks[roundKey]) bracketPicks[roundKey] = {};

  if (bracketPicks[roundKey][matchId] === team) {
    // Deselect — cascade-clear all downstream picks
    delete bracketPicks[roundKey][matchId];
    cascadeClear(roundKey, matchId);
  } else {
    const prev = bracketPicks[roundKey][matchId];
    bracketPicks[roundKey][matchId] = team;
    // If changed, clear downstream
    if (prev && prev !== team) cascadeClear(roundKey, matchId);
  }

  // Full re-render of bracket content (all rounds interdependent)
  const content = document.getElementById('bracket-content');
  if (content) content.innerHTML = buildAllRounds();

  updateSubmitBtn();
  autoSaveBracket();
};

// When a pick changes, clear all picks in later rounds that
// depended on the changed match's outcome.
const cascadeClear = (roundKey, matchId) => {
  const order = ['r16', 'qf', 'sf', 'final'];
  const idx   = order.indexOf(roundKey);
  if (idx < 0) return;

  // Clear all picks in rounds after this one
  for (let i = idx + 1; i < order.length; i++) {
    bracketPicks[order[i]] = {};
  }
};

// ── PROGRESS ──────────────────────────────────────────────────
const updateSubmitBtn = () => {
  const btn = document.getElementById('btn-bracket-submit');
  if (btn) btn.disabled = !bracketPicks.final?.['m104'];
};

// ── AUTO-SAVE ─────────────────────────────────────────────────
let saveTimer = null;
const autoSaveBracket = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!currentHouseId) return;
    const complete = !!bracketPicks.final?.['m104'];
    await autoSave(currentHouseId, {
      bracketPicks,
      progress: complete ? 'done' : 'bracket',
    });
  }, 800);
};

// ── FINAL SUBMIT ──────────────────────────────────────────────
export const bracketSubmit = async () => {
  if (!bracketPicks.final?.['m104']) return;

  const msg = document.getElementById('bracket-msg');
  if (msg) { msg.textContent = 'Locking in your predictions…'; msg.style.color = 'var(--muted)'; }

  const result = await autoSave(currentHouseId, {
    bracketPicks,
    progress: 'done',
    submittedAt: Date.now(),
  });

  if (result.ok) {
    Analytics.pickSubmitted(currentHouseId, bracketPicks.final['m104']);
    return true; // signal to parent to show success screen
  } else {
    if (msg) { msg.textContent = 'Save failed — please try again.'; msg.style.color = 'var(--red)'; }
    return false;
  }
};

export const getBracketPicks = () => JSON.parse(JSON.stringify(bracketPicks));
