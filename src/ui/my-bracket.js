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
        ${buildBracket(bp, pick.groupStandings || {}, pick.r32picks || {})}
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
const buildBracket = (bp, groupStandings, r32picks_raw) => {
  // Resolve both teams for each R16 match
  // Walkovers: team = groupStandings[group].first
  // Clickable r32: team = r32picks_raw[matchId]
  const wo = (group) => groupStandings[group]?.first || null;  // walkover team
  const r32 = (id)   => r32picks_raw[id] || null;              // clickable r32 winner

  // R16 participants (teamA, teamB per match)
  const r16p = {
    m89: [wo('E'),    wo('I')   ],  // 1E walkover vs 1I walkover
    m90: [r32('m73'), r32('m75')],  // w73 vs w75
    m91: [r32('m76'), r32('m78')],  // w76 vs w78
    m92: [wo('A'),    wo('L')   ],  // 1A walkover vs 1L walkover
    m93: [r32('m83'), r32('m84')],  // w83 vs w84
    m94: [wo('D'),    wo('G')   ],  // 1D walkover vs 1G walkover
    m95: [r32('m86'), r32('m88')],  // w86 vs w88
    m96: [wo('B'),    wo('K')   ],  // 1B walkover vs 1K walkover
  };

  // QF participants come from R16 picks
  const r16picks = bp.r16 || {};
  const qfp = {
    m97:  [r16picks['m89'], r16picks['m90']],
    m99:  [r16picks['m91'], r16picks['m92']],
    m98:  [r16picks['m93'], r16picks['m94']],
    m100: [r16picks['m95'], r16picks['m96']],
  };

  // SF participants come from QF picks
  const qfpicks = bp.qf || {};
  const sfp = {
    m101: [qfpicks['m97'],  qfpicks['m98'] ],
    m102: [qfpicks['m99'],  qfpicks['m100']],
  };

  // Final participants come from SF picks
  const sfpicks = bp.sf || {};
  const finalTeams = [sfpicks['m101'], sfpicks['m102']];

  // 3rd place participants = SF losers
  const sf1 = sfpicks['m101'], sf2 = sfpicks['m102'];
  const qf97=qfpicks['m97'], qf98=qfpicks['m98'];
  const qf99=qfpicks['m99'], qf100=qfpicks['m100'];
  const sfLoser1 = sf1 ? (sf1===qf97 ? qf98 : qf97) : null;
  const sfLoser2 = sf2 ? (sf2===qf99 ? qf100 : qf99) : null;
  const thirdTeams = [sfLoser1, sfLoser2];

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

  return `
  <div class="bk-bracket">

    <!-- R16 column -->
    <div class="bk-col bk-col-r16">
      <div class="bk-col-label">Round of 16</div>

      <div class="bk-group">
        ${r16match(89,'m89',r16picks,'Sat 4 Jul · Philadelphia', r16p.m89[0], r16p.m89[1])}
        ${r16match(90,'m90',r16picks,'Sat 4 Jul · Houston',      r16p.m90[0], r16p.m90[1])}
      </div>

      <div class="bk-group">
        ${r16match(91,'m91',r16picks,'Sun 5 Jul · New York NJ',  r16p.m91[0], r16p.m91[1])}
        ${r16match(92,'m92',r16picks,'Sun 5 Jul · Mexico City',  r16p.m92[0], r16p.m92[1])}
      </div>

      <div class="bk-group">
        ${r16match(93,'m93',r16picks,'Mon 6 Jul · Dallas',       r16p.m93[0], r16p.m93[1])}
        ${r16match(94,'m94',r16picks,'Mon 6 Jul · Seattle',      r16p.m94[0], r16p.m94[1])}
      </div>

      <div class="bk-group">
        ${r16match(95,'m95',r16picks,'Tue 7 Jul · Atlanta',      r16p.m95[0], r16p.m95[1])}
        ${r16match(96,'m96',r16picks,'Tue 7 Jul · Vancouver',    r16p.m96[0], r16p.m96[1])}
      </div>
    </div>

    <!-- QF column -->
    <div class="bk-col bk-col-qf">
      <div class="bk-col-label">Quarter-finals</div>

      <div class="bk-group bk-group-qf">
        ${qfmatch(97,'m97',qfpicks,'Thu 9 Jul · Boston',       qfp.m97[0],  qfp.m97[1])}
      </div>
      <div class="bk-group bk-group-qf">
        ${qfmatch(99,'m99',qfpicks,'Sat 11 Jul · Miami',       qfp.m99[0],  qfp.m99[1])}
      </div>
      <div class="bk-group bk-group-qf">
        ${qfmatch(98,'m98',qfpicks,'Fri 10 Jul · Los Angeles', qfp.m98[0],  qfp.m98[1])}
      </div>
      <div class="bk-group bk-group-qf">
        ${qfmatch(100,'m100',qfpicks,'Sat 11 Jul · Kansas City',qfp.m100[0],qfp.m100[1])}
      </div>
    </div>

    <!-- SF column -->
    <div class="bk-col bk-col-sf">
      <div class="bk-col-label">Semi-finals</div>

      <div class="bk-group bk-group-sf">
        ${sfmatch(101,'m101',sfpicks,'Tue 14 Jul · Dallas',  sfp.m101[0], sfp.m101[1])}
      </div>
      <div class="bk-sf-spacer"></div>
      <div class="bk-group bk-group-sf">
        ${sfmatch(102,'m102',sfpicks,'Wed 15 Jul · Atlanta', sfp.m102[0], sfp.m102[1])}
      </div>
    </div>

    <!-- Final + 3rd column -->
    <div class="bk-col bk-col-final">
      <div class="bk-col-label">Finals</div>

      <!-- 3rd place — disconnected, sits above Final -->
      <div class="bk-third-block">
        <div class="bk-third-label">🥉 3rd Place Match</div>
        <div class="bk-third-info">Sat 18 Jul · Miami</div>
        ${teamRow(thirdTeams[0], thirdpick === thirdTeams[0])}
        ${thirdTeams[0] && thirdTeams[1] ? vsDivider() : ''}
        ${teamRow(thirdTeams[1], thirdpick === thirdTeams[1])}
      </div>

      <!-- Final -->
      <div class="bk-final-block">
        <div class="bk-final-label">🏆 The Final</div>
        <div class="bk-final-info">Sun 19 Jul · New York</div>
        ${teamRow(finalTeams[0], finalpick === finalTeams[0])}
        ${finalTeams[0] && finalTeams[1] ? vsDivider() : ''}
        ${teamRow(finalTeams[1], finalpick === finalTeams[1])}
      </div>
    </div>

  </div>`;
};

// ── TEAM ROW ─────────────────────────────────────────────────
// Renders a single team row. isWinner makes name bold.
const teamRow = (team, isWinner) => {
  if (!team) return `<div class="bk-team bk-team-tbd"><span class="bk-name">TBD</span></div>`;
  const t = findTeam(team);
  return `<div class="bk-team ${isWinner ? 'bk-team-winner' : 'bk-team-loser'}">
    <span class="bk-flag">${t?.f ?? '🏳'}</span>
    <span class="bk-name">${team}</span>
  </div>`;
};

// Divider between two teams in a match
const vsDivider = () => `<div class="bk-vs">vs</div>`;

// ── MATCH BUILDERS ────────────────────────────────────────────
// Each match shows both teams, winner is bold, loser is dimmed.
// teamA and teamB are the two participants.
// picked is the user's chosen winner.

const r16match = (num, id, picks, info, teamA, teamB) => {
  const picked = picks[id] || null;
  return `<div class="bk-r16-match">
    <div class="bk-match-meta">M${num} · ${info}</div>
    ${teamRow(teamA, picked === teamA)}
    ${teamA && teamB ? vsDivider() : ''}
    ${teamRow(teamB, picked === teamB)}
  </div>`;
};

const qfmatch = (num, id, picks, info, teamA, teamB) => {
  const picked = picks[id] || null;
  return `<div class="bk-qf-match">
    <div class="bk-match-meta">M${num} · ${info}</div>
    ${teamRow(teamA, picked === teamA)}
    ${teamA && teamB ? vsDivider() : ''}
    ${teamRow(teamB, picked === teamB)}
  </div>`;
};

const sfmatch = (num, id, picks, info, teamA, teamB) => {
  const picked = picks[id] || null;
  return `<div class="bk-sf-match">
    <div class="bk-match-meta">M${num} · ${info}</div>
    ${teamRow(teamA, picked === teamA)}
    ${teamA && teamB ? vsDivider() : ''}
    ${teamRow(teamB, picked === teamB)}
  </div>`;
};

// ── HELPERS ───────────────────────────────────────────────────
const formatDate = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};
