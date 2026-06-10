// src/ui/r32.js
// Step 2: Round of 32 — 8 clickable matches + 8 auto-walkovers
// User clicks one team per playable match.
// Walkover teams are shown as auto-advancing banners.

import {
  R32_CLICKABLE, R32_MATCHES,
  getR32Teams, resolveR32Slot,
} from '../data/bracket.js';
import { findTeam }   from '../data/teams.js';
import { autoSave }   from '../services/firestore.js';
import { Analytics }  from '../services/analytics.js';

let r32picks       = {}; // { m73: 'TeamName', ... }
let groupStandings = {};
let currentHouseId = null;

// ── RENDER ────────────────────────────────────────────────────
export const renderR32Step = (houseId, standings, existingPicks = {}) => {
  currentHouseId = houseId;
  groupStandings = standings;
  r32picks       = { ...existingPicks };

  const el = document.getElementById('step-r32');
  if (!el) return;

  el.innerHTML = `
    <div class="step-header">
      <div class="step-title">Step 2 of 3 — Round of 32</div>
      <div class="step-sub">
        Pick the winner of each <strong>playable match</strong>.
        Teams marked <span class="walkover-label">Walkover ✓</span>
        advance automatically — no guess needed.
      </div>
    </div>

    ${buildWalkovers()}
    <div class="r32-divider">⚽ Playable Matches — Pick Your Winners</div>
    <div id="r32-matches">${buildClickableMatches()}</div>

    <div class="r32-progress" id="r32-progress">${progressText()}</div>

    <div class="btn-row" style="margin-top:16px">
      <button class="btn" onclick="App.r32Back()"
        style="flex:0 0 auto;padding:10px 20px">← Back</button>
      <button class="btn primary" id="btn-r32-next"
        onclick="App.r32Next()"
        ${Object.keys(r32picks).length === 8 ? '' : 'disabled'}>
        Next — Full Bracket →
      </button>
    </div>
    <div class="msg" id="r32-msg"></div>
  `;
};

// ── WALKOVERS SECTION ─────────────────────────────────────────
const buildWalkovers = () => {
  const walkovers = R32_MATCHES.filter(m => m.type === 'walkover');
  const cards = walkovers.map(m => {
    const team = groupStandings[m.slotA.group]?.first;
    const t    = team ? (findTeam(team) || { f: '🏳', n: team }) : null;
    return `
      <div class="walkover-card">
        <div class="walkover-team">
          ${t ? `<span>${t.f}</span> <span>${team}</span>` : '<span class="muted">—</span>'}
        </div>
        <span class="walkover-label">Walkover ✓</span>
        <div class="walkover-note">→ Round of 16</div>
      </div>`;
  }).join('');

  return `
    <div class="walkover-section">
      <div class="walkover-header">🚀 Auto-advancing to Round of 16 (8 walkovers)</div>
      <div class="walkover-grid">${cards}</div>
    </div>`;
};

// ── CLICKABLE MATCHES ─────────────────────────────────────────
const buildClickableMatches = () =>
  R32_CLICKABLE.map(match => buildMatchCard(match)).join('');

const buildMatchCard = (match) => {
  const { teamA, teamB } = getR32Teams(match.id, groupStandings);
  const picked           = r32picks[match.id] || null;

  const btnA = teamCard(match.id, teamA, picked === teamA, picked && picked !== teamA);
  const btnB = teamCard(match.id, teamB, picked === teamB, picked && picked !== teamB);

  return `
    <div class="r32-match-card ${picked ? 'r32-picked' : ''}" id="r32-match-${match.id}">
      <div class="r32-match-label">Match ${match.num} · ${match.date}</div>
      <div class="r32-match-teams">
        ${btnA}
        <span class="vs-label">VS</span>
        ${btnB}
      </div>
    </div>`;
};

const teamCard = (matchId, team, isSelected, isDimmed) => {
  if (!team) {
    return `<div class="r32-team-btn r32-team-empty">TBD</div>`;
  }
  const t = findTeam(team) || { f: '🏳', n: team };
  return `
    <button class="r32-team-btn
      ${isSelected ? ' r32-selected' : ''}
      ${isDimmed   ? ' r32-dimmed'   : ''}"
      onclick="App.pickR32('${matchId}','${team}')">
      <span class="r32-flag">${t.f}</span>
      <span class="r32-name">${team}</span>
      ${isSelected ? '<span class="r32-tick">✓</span>' : ''}
    </button>`;
};

// ── PICK HANDLER ──────────────────────────────────────────────
export const pickR32 = (matchId, team) => {
  if (r32picks[matchId] === team) {
    delete r32picks[matchId]; // deselect
  } else {
    r32picks[matchId] = team;
  }

  // Re-render just this match card
  const match = R32_CLICKABLE.find(m => m.id === matchId);
  const card  = document.getElementById(`r32-match-${matchId}`);
  if (card && match) card.outerHTML = buildMatchCard(match);

  updateR32Progress();
  autoSaveR32();
};

// ── PROGRESS ──────────────────────────────────────────────────
const progressText = () => {
  const done = Object.keys(r32picks).length;
  return `${done} / 8 matches picked`;
};

const updateR32Progress = () => {
  const done = Object.keys(r32picks).length;
  const prog = document.getElementById('r32-progress');
  const btn  = document.getElementById('btn-r32-next');
  if (prog) prog.textContent = `${done} / 8 matches picked`;
  if (btn)  btn.disabled     = done < 8;
};

// ── AUTO-SAVE ─────────────────────────────────────────────────
let saveTimer = null;
const autoSaveR32 = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!currentHouseId) return;
    const complete = Object.keys(r32picks).length === 8;
    await autoSave(currentHouseId, {
      r32picks,
      progress: complete ? 'bracket' : 'r32',
    });
  }, 800);
};

// ── NAV ───────────────────────────────────────────────────────
export const r32Next = async () => {
  if (Object.keys(r32picks).length < 8) return;
  await autoSave(currentHouseId, { r32picks, progress: 'bracket' });
  Analytics.tabViewed('bracket');
  return r32picks;
};

export const getR32Picks = () => ({ ...r32picks });
