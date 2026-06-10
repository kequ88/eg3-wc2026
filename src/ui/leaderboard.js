// src/ui/leaderboard.js — updated for bracket scoring

import { TEAMS, findTeam }      from '../data/teams.js';
import { loadAllPicks }         from '../services/firestore.js';
import { fetchMatchData, getSimData, SIM_MODE }
  from '../services/openfootball.js';
import { calcTotalScore }       from '../scoring/engine.js';
import { Analytics }            from '../services/analytics.js';
import { isPastDeadline }       from './tabs.js';

let allPicks    = [];
let matchResult = { mdata: {}, status: {}, roundSnaps: {} };
let boardRound  = 'overall';

// ── RENDER ────────────────────────────────────────────────────
export const renderLeaderboard = async () => {
  const el = document.getElementById('tab-board');
  el.innerHTML = `<div class="empty">⏳ Loading picks &amp; scores…</div>`;

  [allPicks, matchResult] = await Promise.all([
    loadAllPicks(),
    SIM_MODE ? Promise.resolve(getSimData()) : fetchMatchData(),
  ]);

  if (!allPicks.length) {
    el.innerHTML = `<div class="empty"><big>⚽</big><br><br>
      No picks yet — be the first from your house!</div>`;
    return;
  }

  el.innerHTML = buildRoundTabs() + buildCards();
};

// ── ROUND TABS ────────────────────────────────────────────────
const buildRoundTabs = () => {
  const completed = Object.keys(matchResult.roundSnaps || {});
  const tabs = ['overall', ...completed].map(r => {
    const SHORT = {
      'Group Stage': 'Groups', 'Round of 32': 'R32',
      'Round of 16': 'R16', 'Quarter-finals': 'QF',
      'Semi-finals': 'SF', 'Final': 'Final',
    };
    const label = r === 'overall' ? 'Overall' : (SHORT[r] || r);
    return `<button class="round-tab ${boardRound === r ? 'active' : ''}"
      onclick="App.setBoardRound('${r}')">${label}</button>`;
  }).join('');
  return `<div class="round-tabs">${tabs}</div>`;
};

// ── CARDS ─────────────────────────────────────────────────────
const buildCards = () => {
  const started = isPastDeadline();

  const scored = allPicks
    .filter(p => p.progress === 'done' || p.bracketPicks)
    .map(p => ({
      ...p,
      score: started
        ? calcTotalScore(p, matchResult.mdata, matchResult.status)
        : 0,
    }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return `<div class="empty">No completed submissions yet.</div>`;
  }

  return scored.map((p, i) => {
    const medal  = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
    const winner = p.bracketPicks?.final?.['m104'] || '—';
    const wTeam  = findTeam(winner);
    const isTop  = i === 0 && started && p.score > 0;

    const avatarHtml = p.avatar
      ? `<img src="${p.avatar}" class="lb-avatar" alt="${p.name}"/>`
      : `<div class="lb-avatar-placeholder">${(p.name||'?').charAt(0).toUpperCase()}</div>`;

    const picksHtml = started
      ? `<div class="board-winner">🏆 ${wTeam?.f ?? ''} ${winner}</div>`
      : `<div class="board-picks-hidden">🔒 Picks hidden until tournament starts</div>`;

    const scoreHtml = started
      ? `<span class="pts">${p.score} pts</span>`
      : `<span class="pts-pending">locked ✓</span>`;

    return `
      <div class="board-card ${isTop ? 'top' : ''}"
        onclick="App.openProfile('${p.houseId}')">
        <div class="board-top">
          <div class="board-name">
            ${avatarHtml}
            <div>
              <div>${medal} ${p.name}</div>
              <div class="house-tag">${p.houseId}</div>
            </div>
          </div>
          ${scoreHtml}
        </div>
        ${picksHtml}
      </div>`;
  }).join('');
};

// ── ROUND TAB SWITCH ──────────────────────────────────────────
export const setBoardRound = (round) => {
  boardRound = round;
  Analytics.leaderboardRoundViewed(round);
  const el = document.getElementById('tab-board');
  if (el) el.innerHTML = buildRoundTabs() + buildCards();
};

export const getCachedPicks       = () => allPicks;
export const getCachedMatchResult = () => matchResult;

// Used by profile.js to render avatars consistently
export const buildAvatar = (pick, size = 'lb') => {
  const dim    = size === 'lb' ? 40 : 80;
  const fSize  = size === 'lb' ? 16 : 32;
  const initial = (pick.name || '?').charAt(0).toUpperCase();
  if (pick.avatar) {
    return `<img src="${pick.avatar}"
      style="width:${dim}px;height:${dim}px;border-radius:50%;object-fit:cover;flex-shrink:0"
      alt="${pick.name}"/>`;
  }
  return `<div style="width:${dim}px;height:${dim}px;border-radius:50%;
    background:var(--green-light);color:var(--green-dark);
    display:flex;align-items:center;justify-content:center;
    font-weight:700;font-size:${fSize}px;flex-shrink:0">
    ${initial}
  </div>`;
};
