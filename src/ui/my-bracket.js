// src/ui/my-bracket.js
// Proper knockout bracket visualization
// Layout: R16 (8 matches, 2 teams each) → QF (4) → SF (2) → Final (1)
// 3rd place match sits above Final, disconnected from main bracket lines
// Connecting lines drawn with CSS borders

import { findTeam }       from '../data/teams.js';
import { getCachedPicks } from './leaderboard.js';
import { isPastDeadline } from './tabs.js';

// Official match order — chronological per FIFA fixture list
// Each entry: { matchNum, r16id, feeds into qf match }
const R16_ORDER = [
  { id: 'm89', num: 89, date: 'Sat 4 Jul', venue: 'Philadelphia',  feedsQF: 'm97' },
  { id: 'm90', num: 90, date: 'Sat 4 Jul', venue: 'Houston',       feedsQF: 'm97' },
  { id: 'm91', num: 91, date: 'Sun 5 Jul', venue: 'New York NJ',   feedsQF: 'm99' },
  { id: 'm92', num: 92, date: 'Sun 5 Jul', venue: 'Mexico City',   feedsQF: 'm99' },
  { id: 'm93', num: 93, date: 'Mon 6 Jul', venue: 'Dallas',        feedsQF: 'm98' },
  { id: 'm94', num: 94, date: 'Mon 6 Jul', venue: 'Seattle',       feedsQF: 'm98' },
  { id: 'm95', num: 95, date: 'Tue 7 Jul', venue: 'Atlanta',       feedsQF: 'm100' },
  { id: 'm96', num: 96, date: 'Tue 7 Jul', venue: 'Vancouver',     feedsQF: 'm100' },
];

const QF_ORDER = [
  { id: 'm97',  num: 97,  date: 'Thu 9 Jul',  venue: 'Boston',      feedsSF: 'm101', r16pair: ['m89','m90'] },
  { id: 'm99',  num: 99,  date: 'Sat 11 Jul', venue: 'Miami',       feedsSF: 'm102', r16pair: ['m91','m92'] },
  { id: 'm98',  num: 98,  date: 'Fri 10 Jul', venue: 'Los Angeles', feedsSF: 'm101', r16pair: ['m93','m94'] },
  { id: 'm100', num: 100, date: 'Sat 11 Jul', venue: 'Kansas City', feedsSF: 'm102', r16pair: ['m95','m96'] },
];

const SF_ORDER = [
  { id: 'm101', num: 101, date: 'Tue 14 Jul', venue: 'Dallas',   feedsFinal: 'm104', qfpair: ['m97','m98'] },
  { id: 'm102', num: 102, date: 'Wed 15 Jul', venue: 'Atlanta',  feedsFinal: 'm104', qfpair: ['m99','m100'] },
];

const getMyHouse = () => localStorage.getItem('eg3_my_house') || null;

// ── RENDER ────────────────────────────────────────────────────
export const renderMyBracket = () => {
  const el = document.getElementById('tab-mybracket');
  if (!el) return;

  const myHouse = getMyHouse();
  if (!myHouse) {
    el.innerHTML = `<div class="empty"><big>🏆</big><br><br>
      Submit your predictions first to see your bracket.<br><br>
      <button class="btn primary" style="max-width:200px"
        onclick="App.switchTab('pick')">Make Picks →</button></div>`;
    return;
  }

  const picks = getCachedPicks();
  const pick  = picks.find(p => p.houseId === myHouse);

  if (!pick?.bracketPicks) {
    el.innerHTML = `<div class="empty"><big>⏳</big><br><br>
      Complete your bracket first.<br>
      <button class="btn primary" style="margin-top:1rem;max-width:200px"
        onclick="App.switchTab('pick')">Complete Picks →</button></div>`;
    return;
  }

  const bp = pick.bracketPicks;
  el.innerHTML = `
    <div class="mybracket-wrap">
      <div class="mybracket-header">
        <div class="mybracket-title">🏆 ${pick.name}'s Bracket</div>
        <div class="mybracket-sub">${pick.houseId} · ${formatDate(pick.submittedAt || pick.ts)}</div>
      </div>
      ${buildPodium(bp)}
      <div class="bracket-scroll-hint">← Scroll to explore your full bracket →</div>
      <div class="bracket-outer">
        ${buildBracket(bp)}
      </div>
    </div>`;
};

// ── PODIUM ────────────────────────────────────────────────────
const buildPodium = (bp) => {
  const champion = bp.final?.['m104'];
  const sf1 = bp.sf?.['m101'], sf2 = bp.sf?.['m102'];
  const runnerUp = champion === sf1 ? sf2 : sf1;
  const third    = bp.third?.['m103'];
  const qf97  = bp.qf?.['m97'],  qf98  = bp.qf?.['m98'];
  const qf99  = bp.qf?.['m99'],  qf100 = bp.qf?.['m100'];
  const sfLosers = [];
  if (sf1 && qf97 && qf98) sfLosers.push(sf1 === qf97 ? qf98 : qf97);
  if (sf2 && qf99 && qf100) sfLosers.push(sf2 === qf99 ? qf100 : qf99);
  const fourth = sfLosers.find(t => t !== third) || null;

  const slot = (team, label, cls, extra='') => {
    if (!team) return '';
    const t = findTeam(team);
    return `<div class="podium-slot ${cls}">
      ${extra}
      <div class="podium-flag">${t?.f ?? '🏳'}</div>
      <div class="podium-name">${team}</div>
      <div class="podium-label">${label}</div>
    </div>`;
  };

  return `<div class="mybracket-podium">
    ${slot(fourth,   '4️⃣ 4th',     'podium-4th')}
    ${slot(third,    '🥉 3rd',      'podium-3rd')}
    ${slot(runnerUp, '🥈 Runner-up','podium-2nd')}
    ${slot(champion, '🥇 Champion', 'podium-1st','<div class="podium-trophy">🏆</div>')}
  </div>`;
};

// ── MAIN BRACKET ──────────────────────────────────────────────
const buildBracket = (bp) => {
  // Build from left (R16) → right (Final)
  // Layout: 4 rows of bracket pairs
  // Row 1: M89/M90 → M97 → M101 → M104
  // Row 2: M91/M92 → M99 → M102 → M104
  // Row 3: M93/M94 → M98 → M101
  // Row 4: M95/M96 → M100 → M102

  // We render as a 4-row grid where each row is a bracket path
  // Top half: rows 1+2 feed into SF m101 and m102
  // Bottom half: rows 3+4 feed into SF m101 and m102

  const r16picks  = bp.r16  || {};
  const qfpicks   = bp.qf   || {};
  const sfpicks   = bp.sf   || {};
  const finalpick = bp.final?.['m104'] || null;
  const thirdpick = bp.third?.['m103'] || null;

  // Helper: team chip
  const chip = (team, isFinal=false, isThird=false) => {
    if (!team) return `<div class="bk-team bk-team-tbd">Awaiting pick…</div>`;
    const t = findTeam(team);
    const cls = isFinal ? 'bk-team-final' : isThird ? 'bk-team-third' : '';
    return `<div class="bk-team ${cls}">
      <span class="bk-flag">${t?.f ?? '🏳'}</span>
      <span class="bk-name">${team}</span>
    </div>`;
  };

  // Helper: match box with two teams
  const matchBox = (matchId, round, picks, isFinal=false, isThird=false, label='') => {
    const team = picks[matchId] || null;
    return `<div class="bk-match ${isFinal?'bk-match-final':''} ${isThird?'bk-match-third':''}">
      ${label ? `<div class="bk-match-label">${label}</div>` : ''}
      ${chip(team, isFinal, isThird)}
    </div>`;
  };

  // SF losers for 3rd place context
  const sf1 = sfpicks['m101'], sf2 = sfpicks['m102'];
  const qf97=qfpicks['m97'], qf98=qfpicks['m98'];
  const qf99=qfpicks['m99'], qf100=qfpicks['m100'];
  const sfLoser1 = sf1 ? (sf1===qf97 ? qf98 : qf97) : null;
  const sfLoser2 = sf2 ? (sf2===qf99 ? qf100 : qf99) : null;

  return `
  <div class="bk-bracket">

    <!-- R16 column -->
    <div class="bk-col bk-col-r16">
      <div class="bk-col-label">Round of 16</div>

      <div class="bk-group">
        ${r16match(89,'m89',r16picks,'Sat 4 Jul · Philadelphia')}
        ${r16match(90,'m90',r16picks,'Sat 4 Jul · Houston')}
      </div>

      <div class="bk-group">
        ${r16match(91,'m91',r16picks,'Sun 5 Jul · New York NJ')}
        ${r16match(92,'m92',r16picks,'Sun 5 Jul · Mexico City')}
      </div>

      <div class="bk-group">
        ${r16match(93,'m93',r16picks,'Mon 6 Jul · Dallas')}
        ${r16match(94,'m94',r16picks,'Mon 6 Jul · Seattle')}
      </div>

      <div class="bk-group">
        ${r16match(95,'m95',r16picks,'Tue 7 Jul · Atlanta')}
        ${r16match(96,'m96',r16picks,'Tue 7 Jul · Vancouver')}
      </div>
    </div>

    <!-- QF column -->
    <div class="bk-col bk-col-qf">
      <div class="bk-col-label">Quarter-finals</div>

      <div class="bk-group bk-group-qf">
        ${qfmatch(97,'m97',qfpicks,'Thu 9 Jul · Boston')}
      </div>
      <div class="bk-group bk-group-qf">
        ${qfmatch(99,'m99',qfpicks,'Sat 11 Jul · Miami')}
      </div>
      <div class="bk-group bk-group-qf">
        ${qfmatch(98,'m98',qfpicks,'Fri 10 Jul · Los Angeles')}
      </div>
      <div class="bk-group bk-group-qf">
        ${qfmatch(100,'m100',qfpicks,'Sat 11 Jul · Kansas City')}
      </div>
    </div>

    <!-- SF column -->
    <div class="bk-col bk-col-sf">
      <div class="bk-col-label">Semi-finals</div>

      <div class="bk-group bk-group-sf">
        ${sfmatch(101,'m101',sfpicks,'Tue 14 Jul · Dallas')}
      </div>
      <div class="bk-sf-spacer"></div>
      <div class="bk-group bk-group-sf">
        ${sfmatch(102,'m102',sfpicks,'Wed 15 Jul · Atlanta')}
      </div>
    </div>

    <!-- Final + 3rd column -->
    <div class="bk-col bk-col-final">
      <div class="bk-col-label">Finals</div>

      <!-- 3rd place — disconnected, sits above Final -->
      <div class="bk-third-block">
        <div class="bk-third-label">🥉 3rd Place Match</div>
        <div class="bk-third-info">Sat 18 Jul · Miami</div>
        <div class="bk-match bk-match-third">
          ${chip(thirdpick, false, true)}
        </div>
      </div>

      <!-- Final -->
      <div class="bk-final-block">
        <div class="bk-final-label">🏆 The Final</div>
        <div class="bk-final-info">Sun 19 Jul · New York</div>
        <div class="bk-match bk-match-final">
          ${chip(finalpick, true, false)}
        </div>
      </div>
    </div>

  </div>`;
};

// ── MATCH BUILDERS ────────────────────────────────────────────
const r16match = (num, id, picks, info) => {
  const team = picks[id] || null;
  const t    = team ? findTeam(team) : null;
  return `<div class="bk-r16-match">
    <div class="bk-match-meta">M${num} · ${info}</div>
    <div class="bk-team ${team ? '' : 'bk-team-tbd'}">
      ${t ? `<span class="bk-flag">${t.f}</span><span class="bk-name">${team}</span>`
          : '<span class="bk-name">Awaiting pick…</span>'}
    </div>
  </div>`;
};

const qfmatch = (num, id, picks, info) => {
  const team = picks[id] || null;
  const t    = team ? findTeam(team) : null;
  return `<div class="bk-qf-match">
    <div class="bk-match-meta">M${num} · ${info}</div>
    <div class="bk-team ${team ? '' : 'bk-team-tbd'}">
      ${t ? `<span class="bk-flag">${t.f}</span><span class="bk-name">${team}</span>`
          : '<span class="bk-name">Awaiting pick…</span>'}
    </div>
  </div>`;
};

const sfmatch = (num, id, picks, info) => {
  const team = picks[id] || null;
  const t    = team ? findTeam(team) : null;
  return `<div class="bk-sf-match">
    <div class="bk-match-meta">M${num} · ${info}</div>
    <div class="bk-team ${team ? '' : 'bk-team-tbd'}">
      ${t ? `<span class="bk-flag">${t.f}</span><span class="bk-name">${team}</span>`
          : '<span class="bk-name">Awaiting pick…</span>'}
    </div>
  </div>`;
};

// ── HELPERS ───────────────────────────────────────────────────
const formatDate = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};
