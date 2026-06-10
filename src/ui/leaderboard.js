// src/ui/leaderboard.js
// Updated: Phase 1 identity (show own picks), flag display, round tabs

import { findTeam }       from '../data/teams.js';
import { loadAllPicks }   from '../services/firestore.js';
import { fetchMatchData, getSimData, SIM_MODE } from '../services/openfootball.js';
import { calcTotalScore } from '../scoring/engine.js';
import { Analytics }      from '../services/analytics.js';
import { isPastDeadline } from './tabs.js';

let allPicks    = [];
let matchResult = { mdata: {}, status: {}, roundSnaps: {} };
let boardRound  = 'overall';

// Phase 1 identity — read from localStorage
const getMyHouse = () => localStorage.getItem('eg3_my_house') || null;

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
  const SHORT = {
    'Group Stage': 'Groups', 'Round of 32': 'R32',
    'Round of 16': 'R16', 'Quarter-finals': 'QF',
    'Semi-finals': 'SF', 'Final': 'Final',
  };
  const tabs = ['overall', ...completed].map(r => {
    const label = r === 'overall' ? 'Overall' : (SHORT[r] || r);
    return `<button class="round-tab ${boardRound === r ? 'active' : ''}"
      onclick="App.setBoardRound('${r}')">${label}</button>`;
  }).join('');
  return `<div class="round-tabs">${tabs}</div>`;
};

// ── PLAYER CARDS ──────────────────────────────────────────────
const buildCards = () => {
  const started  = isPastDeadline();
  const myHouse  = getMyHouse();

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
    const medal   = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
    const isTop   = i === 0 && started && p.score > 0;
    const isMe    = p.houseId === myHouse;

    // Avatar
    const avatarHtml = p.avatar
      ? `<img src="${p.avatar}" class="lb-avatar" alt="${p.name}"/>`
      : `<div class="lb-avatar-placeholder">${(p.name||'?').charAt(0).toUpperCase()}</div>`;

    // Score badge
    const scoreHtml = started
      ? `<span class="pts">${p.score} pts</span>`
      : isMe
        ? `<span class="pts-pending">my picks ✓</span>`
        : `<span class="pts-pending">locked ✓</span>`;

    // Picks — show to owner always, show to everyone after deadline
    const showPicks = started || isMe;
    const picksHtml = showPicks
      ? buildPicksFlags(p)
      : `<div class="board-picks-hidden">🔒 Picks hidden until tournament starts</div>`;

    return `
      <div class="board-card ${isTop ? 'top' : ''} ${isMe ? 'my-card' : ''}"
        onclick="App.openProfile('${p.houseId}')">
        <div class="board-top">
          <div class="board-name">
            ${avatarHtml}
            <div>
              <div>${medal} ${p.name} ${isMe ? '<span class="you-badge">👤 You</span>' : ''}</div>
              <div class="house-tag">${p.houseId}</div>
            </div>
          </div>
          ${scoreHtml}
        </div>
        ${picksHtml}
      </div>`;
  }).join('');
};

// ── PICKS FLAGS ROW ───────────────────────────────────────────
// Show exactly 4 flags: Champion → Runner-up → 3rd → 4th
// Derived from Final (m104), 3rd place (m103), and SF picks (m101, m102)
const buildPicksFlags = (p) => {
  const bp = p.bracketPicks;
  if (!bp) return '';

  // Champion — user's Final winner pick
  const champion = bp.final?.['m104'] || null;

  // Runner-up — the finalist who lost (in Final but not Champion)
  // The two finalists come from SF winners: m101 winner and m102 winner
  const sf1 = bp.sf?.['m101'] || null;
  const sf2 = bp.sf?.['m102'] || null;
  const runnerUp = sf1 && sf2
    ? (sf1 === champion ? sf2 : sf1)
    : null;

  // 3rd place — user's bronze match winner pick
  const third = bp.third?.['m103'] || null;

  // 4th place — the bronze match loser
  // Bronze participants are the two SF losers
  // SF losers = whichever SF team was NOT picked as SF winner
  // We need the SF participants — stored in r16 picks feeding into SF
  // Simpler: from QF picks that fed into SF
  // Actually simplest: third and fourth are both from SF losers
  // fourth = the bronze participant who wasn't picked as 3rd
  const sfLosers = [];
  if (bp.sf) {
    // We know sf1 and sf2 are the SF winners
    // SF losers are the teams that played sf1/sf2 but lost
    // These come from QF picks: m97 vs m98 → m101, m99 vs m100 → m102
    const qf1a = bp.qf?.['m97'] || null;
    const qf1b = bp.qf?.['m98'] || null;
    const qf2a = bp.qf?.['m99'] || null;
    const qf2b = bp.qf?.['m100'] || null;
    // SF match 101 = winner of m97 vs winner of m98
    // loser of m101 = whichever of qf1a/qf1b was NOT picked as sf1
    if (qf1a && qf1b && sf1) sfLosers.push(sf1 === qf1a ? qf1b : qf1a);
    if (qf2a && qf2b && sf2) sfLosers.push(sf2 === qf2a ? qf2b : qf2a);
  }
  const fourth = sfLosers.find(t => t !== third) || null;

  const picks = [
    { team: champion, label: '🥇', cls: 'pick-winner'   },
    { team: runnerUp, label: '🥈', cls: 'pick-finalist' },
    { team: third,    label: '🥉', cls: 'pick-third'    },
    { team: fourth,   label: '4️⃣', cls: 'pick-fourth'  },
  ];

  const chips = picks
    .filter(({ team }) => team)
    .map(({ team, label, cls }) => {
      const t = findTeam(team);
      const flag = t?.f ?? '🏳';
      // Show flag emoji + truncated name for cross-platform clarity
      const short = team.length > 8 ? team.slice(0, 7) + '…' : team;
      return `<span class="pick-flag-chip ${cls}" title="${label} ${team}">
        <span class="chip-flag">${flag}</span>
        <span class="chip-name">${short}</span>
      </span>`;
    }).join('');

  return chips ? `<div class="pick-flags-row">${chips}</div>` : '';
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

// ── BUILD AVATAR (used by profile.js) ────────────────────────
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
