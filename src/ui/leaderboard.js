// src/ui/leaderboard.js
// Updated: Phase 1 identity (show own picks), flag display, round tabs
// Performance: two-layer cache — in-memory (module) + sessionStorage (cross-render)

import { findTeam }       from '../data/teams.js';
import { loadAllPicksCached } from '../services/firestore.js';
import { fetchMatchData, getSimData, SIM_MODE } from '../services/openfootball.js';
import { calcTotalScore } from '../scoring/engine.js';
import { Analytics }      from '../services/analytics.js';
import { isPastDeadline } from './tabs.js';

// ── CACHE ─────────────────────────────────────────────────────
// In-memory cache survives tab switches within the same session.
// Populated once, reused until TTL expires.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let allPicks    = [];
let matchResult = { mdata: {}, status: {}, roundSnaps: {} };
let boardRound  = 'overall';

let _cacheTime  = 0;          // epoch ms of last full fetch
let _scoredCache = null;      // sorted+scored array, cleared when cache refreshes

const isCacheWarm  = () => (Date.now() - _cacheTime) < CACHE_TTL_MS;
const bustCache    = () => { _cacheTime = 0; _scoredCache = null; };
export const refreshLeaderboard = bustCache; // call from admin after entering results

// Phase 1 identity — read from localStorage
const getMyHouse = () => localStorage.getItem('eg3_my_house') || null;

// ── RENDER ────────────────────────────────────────────────────
export const renderLeaderboard = async () => {
  const el = document.getElementById('tab-board');

  // Fast path: cache is warm, skip all network calls
  if (isCacheWarm()) {
    el.innerHTML = buildRoundTabs() + buildCards();
    return;
  }

  el.innerHTML = `<div class="empty">⏳ Loading picks &amp; scores…</div>`;

  try {
    [allPicks, matchResult] = await Promise.all([
      loadAllPicksCached(),
      SIM_MODE ? Promise.resolve(getSimData()) : fetchMatchDataCached(),
    ]);
  } catch (err) {
    console.error('[Leaderboard] fetch error', err);
    el.innerHTML = `<div class="empty">⚠️ Failed to load scores. Please try again.</div>`;
    return;
  }

  _cacheTime   = Date.now();
  _scoredCache = null; // force re-score with fresh data

  if (!allPicks.length) {
    el.innerHTML = `<div class="empty"><big>⚽</big><br><br>
      No picks yet — be the first from your house!</div>`;
    return;
  }

  el.innerHTML = buildRoundTabs() + buildCards();
};

// ── MATCH DATA CACHE (sessionStorage, 5-min TTL) ─────────────
const MATCH_CACHE_KEY = 'eg3_match_cache';

const fetchMatchDataCached = async () => {
  try {
    const raw = sessionStorage.getItem(MATCH_CACHE_KEY);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if ((Date.now() - ts) < CACHE_TTL_MS) {
        console.log('[Leaderboard] match data from sessionStorage cache');
        return data;
      }
    }
  } catch (_) { /* corrupt cache — fall through */ }

  const data = await fetchMatchData();

  try {
    sessionStorage.setItem(MATCH_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) { /* sessionStorage full — skip caching */ }

  return data;
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

  // Re-use scored array if already computed this cache window
  if (!_scoredCache) {
    _scoredCache = allPicks
      .filter(p => p.progress === 'done' || p.bracketPicks)
      .map(p => ({
        ...p,
        score: started
          ? calcTotalScore(p, matchResult.mdata, matchResult.status)
          : 0,
      }))
      .sort((a, b) => b.score - a.score);
  }

  const scored = _scoredCache;

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
const buildPicksFlags = (p) => {
  const bp = p.bracketPicks;
  if (!bp) return '';

  const champion = bp.final?.['m104'] || null;
  const sf1 = bp.sf?.['m101'] || null;
  const sf2 = bp.sf?.['m102'] || null;
  const runnerUp = sf1 && sf2
    ? (sf1 === champion ? sf2 : sf1)
    : null;
  const third = bp.third?.['m103'] || null;

  const sfLosers = [];
  if (bp.sf) {
    const qf1a = bp.qf?.['m97'] || null;
    const qf1b = bp.qf?.['m98'] || null;
    const qf2a = bp.qf?.['m99'] || null;
    const qf2b = bp.qf?.['m100'] || null;
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
