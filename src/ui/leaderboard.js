// src/ui/leaderboard.js
// Compact table view: dense row-per-player leaderboard,
// round tabs removed, two-layer cache from perf pass retained.

import { findTeam }       from '../data/teams.js';
import { loadAllPicksCached } from '../services/firestore.js';
import { fetchMatchData, getSimData, SIM_MODE } from '../services/openfootball.js';
import { calcTotalScore } from '../scoring/engine.js';
import { Analytics }      from '../services/analytics.js';
import { isPastDeadline } from './tabs.js';

// ── CACHE ─────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let allPicks    = [];
let matchResult = { mdata: {}, status: {}, roundSnaps: {} };

let _cacheTime   = 0;
let _scoredCache = null;

const isCacheWarm = () => (Date.now() - _cacheTime) < CACHE_TTL_MS;
const bustCache   = () => { _cacheTime = 0; _scoredCache = null; };
export const refreshLeaderboard = bustCache;

const getMyHouse = () => localStorage.getItem('eg3_my_house') || null;

// ── RENDER ────────────────────────────────────────────────────
export const renderLeaderboard = async () => {
  const el = document.getElementById('tab-board');

  if (isCacheWarm()) {
    el.innerHTML = buildTable();
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
  _scoredCache = null;

  if (!allPicks.length) {
    el.innerHTML = `<div class="empty"><big>⚽</big><br><br>
      No picks yet — be the first from your house!</div>`;
    return;
  }

  el.innerHTML = buildTable();
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
  } catch (_) {}

  const data = await fetchMatchData();

  try {
    sessionStorage.setItem(MATCH_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}

  return data;
};

// ── LEADERBOARD TABLE ─────────────────────────────────────────
const buildTable = () => {
  const started = isPastDeadline();
  const myHouse  = getMyHouse();

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

  const rows = scored.map((p, i) => buildRow(p, i, started, myHouse)).join('');

  return `
    <table class="lb-table">
      <thead>
        <tr>
          <th class="lb-col-rank">#</th>
          <th class="lb-col-jiran">Jiran</th>
          <th class="lb-col-medal" title="Champion pick">🥇</th>
          <th class="lb-col-medal" title="Runner-up pick">🥈</th>
          <th class="lb-col-medal" title="3rd place pick">🥉</th>
          <th class="lb-col-qf">QF</th>
          <th class="lb-col-pts">PTS</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
};

const buildRow = (p, i, started, myHouse) => {
  const rank = i + 1;
  const isMe  = p.houseId === myHouse;

  const avatarHtml = p.avatar
    ? `<img src="${p.avatar}" class="lb-avatar" alt="${p.name}"/>`
    : `<div class="lb-avatar-placeholder">${(p.name||'?').charAt(0).toUpperCase()}</div>`;

  const houseId = p.houseId || '';
  const [lane, number] = splitHouseId(houseId);
  const name = p.name || '';

  const scoreHtml = started
    ? `${p.score}`
    : isMe
      ? `<span class="pts-pending" title="my picks">✓</span>`
      : `<span class="pts-pending" title="locked">🔒</span>`;

  const showPicks = started || isMe;

  const podium = showPicks ? getPodiumTeams(p) : { champion: null, runnerUp: null, third: null };
  const qfFlags = showPicks ? buildQfFlags(p) : '';

  const champFlag = showPicks ? medalFlag(podium.champion) : '<span class="medal-hidden">🔒</span>';
  const runnerFlag = showPicks ? medalFlag(podium.runnerUp) : '<span class="medal-hidden">🔒</span>';
  const thirdFlag = showPicks ? medalFlag(podium.third) : '<span class="medal-hidden">🔒</span>';

  return `
    <tr class="lb-row ${isMe ? 'my-row' : ''}"
      onclick="App.openProfile('${houseId}')">
      <td class="lb-col-rank">${rank}</td>
      <td class="lb-col-jiran">
        <div class="jiran-cell">
          <span class="jiran-house-id">
            <span class="jiran-lane">${lane}</span>
            <span class="jiran-number">${number}</span>
          </span>
          ${avatarHtml}
          <span class="jiran-name">${name}${isMe ? ' <span class="you-badge">You</span>' : ''}</span>
        </div>
      </td>
      <td class="lb-col-medal">${champFlag}</td>
      <td class="lb-col-medal">${runnerFlag}</td>
      <td class="lb-col-medal">${thirdFlag}</td>
      <td class="lb-col-qf">${qfFlags}</td>
      <td class="lb-col-pts">${scoreHtml}</td>
    </tr>`;
};

// ── HOUSE ID SPLIT (Lxx-Nxx, e.g. L73-N35 -> ["L73","N35"]) ───
const splitHouseId = (houseId) => {
  const idx = houseId.indexOf('-N');
  if (idx === -1) return [houseId, ''];
  return [houseId.slice(0, idx), houseId.slice(idx + 1)];
};

// ── PODIUM TEAM EXTRACTION ────────────────────────────────────
const getPodiumTeams = (p) => {
  const bp = p.bracketPicks;
  if (!bp) return { champion: null, runnerUp: null, third: null };

  const champion = bp.final?.['m104'] || null;
  const sf1 = bp.sf?.['m101'] || null;
  const sf2 = bp.sf?.['m102'] || null;
  const runnerUp = sf1 && sf2 ? (sf1 === champion ? sf2 : sf1) : null;
  const third = bp.third?.['m103'] || null;

  return { champion, runnerUp, third };
};

// ── QF FLAGS (4 quarterfinalist picks, excluding podium) ──────
const buildQfFlags = (p) => {
  const bp = p.bracketPicks;
  if (!bp) return '';

  const allQF = Object.values(bp.r16 || {}).filter(Boolean); // 8 QF picks
  const { champion, runnerUp, third } = getPodiumTeams(p);

  const sfLosers = [];
  if (bp.sf) {
    const qf1a = bp.qf?.['m97'] || null;
    const qf1b = bp.qf?.['m98'] || null;
    const qf2a = bp.qf?.['m99'] || null;
    const qf2b = bp.qf?.['m100'] || null;
    const sf1 = bp.sf?.['m101'] || null;
    const sf2 = bp.sf?.['m102'] || null;
    if (qf1a && qf1b && sf1) sfLosers.push(sf1 === qf1a ? qf1b : qf1a);
    if (qf2a && qf2b && sf2) sfLosers.push(sf2 === qf2a ? qf2b : qf2a);
  }
  const fourth = sfLosers.find(t => t !== third) || null;

  const podium = [champion, runnerUp, third, fourth].filter(Boolean);
  const others = allQF.filter(t => !podium.includes(t));

  return others.map(team => smallFlag(team)).join('');
};

const medalFlag = (team) => {
  if (!team) return '<span class="flag-empty">—</span>';
  const t = findTeam(team);
  const flag = t?.f ?? '🏳';
  return `<span class="medal-flag" title="${team}">${flag}</span>`;
};

const smallFlag = (team) => {
  const t = findTeam(team);
  const flag = t?.f ?? '🏳';
  return `<span class="qf-flag" title="${team}">${flag}</span>`;
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