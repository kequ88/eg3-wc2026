// src/ui/teams-page.js
//
// Renders the Teams tab — all 48 qualified nations grouped by
// confederation, each showing their current tournament status,
// match record, and knockout wins.
//
// Data comes from openfootball via the leaderboard's cached result
// so we don't make a duplicate network request.
// If the leaderboard hasn't been opened yet, we fetch match data
// ourselves using the same sessionStorage cache.
//
// Features:
//   - Search filter across all 48 teams
//   - Grouped by confederation (CONMEBOL, CONCACAF, UEFA, AFC, CAF, OFC)
//   - Eliminated teams greyed out
//   - Champion gets gold border
//   - Simulation mode banner when SIM_MODE is active

import { TEAMS }    from '../data/teams.js';
import { SIM_MODE, fetchMatchData, getSimData } from '../services/openfootball.js';
import { getCachedMatchResult } from './leaderboard.js';
import { Analytics } from '../services/analytics.js';

const CONF_ORDER = ['CONMEBOL', 'CONCACAF', 'UEFA', 'AFC', 'CAF', 'OFC'];

// ── MATCH DATA CACHE (mirrors leaderboard's cache key) ────────
const MATCH_CACHE_KEY = 'eg3_match_cache';
const CACHE_TTL_MS    = 5 * 60 * 1000;

const getMatchResult = async () => {
  // Fast path: leaderboard already fetched and cached in memory
  const cached = getCachedMatchResult();
  if (cached && Object.keys(cached.mdata || {}).length > 0) return cached;

  // Second path: sessionStorage has a warm copy
  try {
    const raw = sessionStorage.getItem(MATCH_CACHE_KEY);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if ((Date.now() - ts) < CACHE_TTL_MS) {
        console.log('[TeamsPage] match data from sessionStorage cache');
        return data;
      }
    }
  } catch (_) {}

  // Cold path: fetch fresh (also warms sessionStorage for leaderboard)
  const data = SIM_MODE ? getSimData() : await fetchMatchData();
  try {
    sessionStorage.setItem(MATCH_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}
  return data;
};

// ── RENDER ────────────────────────────────────────────────────
export const renderTeamsPage = async () => {
  const el = document.getElementById('tab-teams');

  // Show skeleton while fetching (only visible on cold load)
  el.innerHTML = `<div class="empty">⏳ Loading team data…</div>`;

  const { mdata, status } = await getMatchResult();

  const simBanner = SIM_MODE
    ? `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;
                   padding:10px 14px;margin-bottom:14px;font-size:13px;color:#856404">
         🧪 <strong>Simulation mode active</strong> — showing fake match data for testing.
         Set <code>SIM_MODE = false</code> in openfootball.js before going live.
       </div>`
    : '';

  const searchHtml = `
    <div class="teams-search-wrap">
      <input type="text" class="search-input-full"
        id="teams-search"
        placeholder="🔍 Search team…"
        oninput="App.filterTeamsPage()"/>
    </div>`;

  const confsHtml = CONF_ORDER.map(conf => {
    const teams = TEAMS.filter(t => t.conf === conf);
    const cardsHtml = teams.map(t => buildTeamCard(t, mdata, status)).join('');
    return `
      <div class="conf-group" data-conf="${conf}">
        <div class="conf-label">${conf}</div>
        <div class="teams-grid">${cardsHtml}</div>
      </div>`;
  }).join('');

  el.innerHTML = simBanner + searchHtml + confsHtml;
};

// ── TEAM CARD ─────────────────────────────────────────────────
const buildTeamCard = (team, mdata, status) => {
  const s = status[team.n] || { reachedStage: 'Group Stage', eliminatedAt: null };
  const m = mdata[team.n]  || { groupWins: 0, groupDraws: 0, groupLosses: 0, koWins: 0 };

  const isElim  = !!s.eliminatedAt;
  const isChamp = s.reachedStage === 'Winner';

  const stageLabel = isChamp
    ? '🏆 Champion'
    : isElim
      ? `❌ Out at ${s.eliminatedAt}`
      : `✅ ${s.reachedStage}`;

  const stageClass = isElim ? 'neg' : isChamp ? 'gold' : '';

  const hasStats = m.groupWins || m.groupDraws || m.groupLosses || m.koWins;
  const statsHtml = hasStats
    ? `<div class="team-stat-row">
         <span title="Group wins">⚽ ${m.groupWins}W</span>
         <span title="Group draws">🤝 ${m.groupDraws}D</span>
         <span title="Group losses">❌ ${m.groupLosses}L</span>
         ${m.koWins ? `<span class="ko-win" title="Knockout wins">🎯 ${m.koWins} KO</span>` : ''}
       </div>`
    : `<div class="team-stat-row">
         <span style="color:var(--muted);font-size:10px">No matches yet</span>
       </div>`;

  return `
    <div class="team-stat-card ${isElim ? 'eliminated' : ''} ${isChamp ? 'champion' : ''}"
      data-name="${team.n}">
      <div class="team-stat-flag">${team.f}</div>
      <div class="team-stat-name">${team.n}</div>
      <div class="team-stat-stage ${stageClass}">${stageLabel}</div>
      ${statsHtml}
    </div>`;
};

// ── SEARCH FILTER ─────────────────────────────────────────────
export const filterTeamsPage = () => {
  const input = document.getElementById('teams-search');
  if (!input) return;

  const q = input.value.toLowerCase().trim();

  document.querySelectorAll('.team-stat-card').forEach(card => {
    const match = card.dataset.name.toLowerCase().includes(q);
    card.style.display = match ? '' : 'none';
  });

  document.querySelectorAll('.conf-group').forEach(group => {
    const anyVisible = [...group.querySelectorAll('.team-stat-card')]
      .some(c => c.style.display !== 'none');
    group.style.display = anyVisible ? '' : 'none';
  });

  if (q.length > 2) Analytics.teamsSearched(q);
};
