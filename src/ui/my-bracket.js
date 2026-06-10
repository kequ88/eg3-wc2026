// src/ui/my-bracket.js
//
// Renders the "My Bracket" tab — a visual tree showing the user's
// full knockout predictions from R16 through to the Final.
//
// Only shown when the user has submitted (eg3_my_house in localStorage).
// Layout: horizontal bracket tree, left side feeds into centre.
// Rounds: R16 (8 matches) → QF (4) → SF (2) → Final + 3rd Place (2)

import { findTeam }       from '../data/teams.js';
import { R16_MATCHES, QF_MATCHES, SF_MATCHES, FINAL_MATCH } from '../data/bracket.js';
import { getCachedPicks } from './leaderboard.js';
import { isPastDeadline } from './tabs.js';

const getMyHouse = () => localStorage.getItem('eg3_my_house') || null;

// ── RENDER ────────────────────────────────────────────────────
export const renderMyBracket = () => {
  const el = document.getElementById('tab-mybracket');
  if (!el) return;

  const myHouse = getMyHouse();
  if (!myHouse) {
    el.innerHTML = `
      <div class="empty">
        <big>🏆</big><br><br>
        Submit your predictions first to see your bracket.
        <br><br>
        <button class="btn primary" style="max-width:200px"
          onclick="App.switchTab('pick')">Make Picks →</button>
      </div>`;
    return;
  }

  const picks = getCachedPicks();
  const pick  = picks.find(p => p.houseId === myHouse);

  if (!pick || !pick.bracketPicks) {
    el.innerHTML = `
      <div class="empty">
        <big>⏳</big><br><br>
        Your bracket hasn't been submitted yet.<br>
        <button class="btn primary" style="margin-top:1rem;max-width:200px"
          onclick="App.switchTab('pick')">Complete Picks →</button>
      </div>`;
    return;
  }

  const bp = pick.bracketPicks;

  el.innerHTML = `
    <div class="mybracket-wrap">
      <div class="mybracket-header">
        <div class="mybracket-title">🏆 ${pick.name}'s Bracket</div>
        <div class="mybracket-sub">${pick.houseId} · Submitted ${formatDate(pick.submittedAt || pick.ts)}</div>
      </div>

      ${buildWinnerHero(bp)}
      ${buildBracketTree(bp)}
    </div>`;
};

// ── WINNER HERO ───────────────────────────────────────────────
const buildWinnerHero = (bp) => {
  const champion = bp.final?.['m104'];
  const runnerUp = getRunnerUp(bp);
  const third    = bp.third?.['m103'];
  const fourth   = getFourth(bp);

  if (!champion) return '';

  const ct = findTeam(champion);
  const rt = runnerUp ? findTeam(runnerUp) : null;
  const t3 = third    ? findTeam(third)    : null;
  const t4 = fourth   ? findTeam(fourth)   : null;

  return `
    <div class="mybracket-podium">
      ${t4 ? `<div class="podium-slot podium-4th">
        <div class="podium-flag">${t4.f}</div>
        <div class="podium-name">${fourth}</div>
        <div class="podium-label">4th Place</div>
      </div>` : ''}
      ${t3 ? `<div class="podium-slot podium-3rd">
        <div class="podium-flag">${t3.f}</div>
        <div class="podium-name">${third}</div>
        <div class="podium-label">🥉 3rd Place</div>
      </div>` : ''}
      ${rt ? `<div class="podium-slot podium-2nd">
        <div class="podium-flag">${rt.f}</div>
        <div class="podium-name">${runnerUp}</div>
        <div class="podium-label">🥈 Runner-up</div>
      </div>` : ''}
      <div class="podium-slot podium-1st">
        <div class="podium-trophy">🏆</div>
        <div class="podium-flag podium-flag-lg">${ct?.f ?? '🏳'}</div>
        <div class="podium-name podium-name-lg">${champion}</div>
        <div class="podium-label">🥇 Champion</div>
      </div>
    </div>`;
};

// ── BRACKET TREE ──────────────────────────────────────────────
const buildBracketTree = (bp) => {
  return `
    <div class="bracket-tree">
      <div class="bracket-tree-inner">

        <div class="bt-round bt-r16">
          <div class="bt-round-label">Round of 16</div>
          ${R16_MATCHES.map(m => btMatchCard(bp.r16?.[m.id], 'r16')).join('')}
        </div>

        <div class="bt-round bt-qf">
          <div class="bt-round-label">Quarter-finals</div>
          ${QF_MATCHES.map(m => btMatchCard(bp.qf?.[m.id], 'qf')).join('')}
        </div>

        <div class="bt-round bt-sf">
          <div class="bt-round-label">Semi-finals</div>
          ${SF_MATCHES.map(m => btMatchCard(bp.sf?.[m.id], 'sf')).join('')}
        </div>

        <div class="bt-round bt-final">
          <div class="bt-round-label">3rd Place</div>
          ${btMatchCard(bp.third?.['m103'], 'third')}
          <div class="bt-round-label" style="margin-top:12px">Final</div>
          ${btMatchCard(bp.final?.['m104'], 'final')}
        </div>

      </div>
    </div>`;
};

// ── MATCH CARD ────────────────────────────────────────────────
const btMatchCard = (team, round) => {
  if (!team) return `<div class="bt-match bt-match-empty">—</div>`;
  const t = findTeam(team);
  const cls = round === 'final'  ? 'bt-match-final'
            : round === 'third'  ? 'bt-match-third'
            : '';
  return `
    <div class="bt-match ${cls}">
      <span class="bt-flag">${t?.f ?? '🏳'}</span>
      <span class="bt-name">${team}</span>
    </div>`;
};

// ── HELPERS ───────────────────────────────────────────────────
const getRunnerUp = (bp) => {
  const champion = bp.final?.['m104'];
  const sf1 = bp.sf?.['m101'];
  const sf2 = bp.sf?.['m102'];
  if (!champion || !sf1 || !sf2) return null;
  return sf1 === champion ? sf2 : sf1;
};

const getFourth = (bp) => {
  const third = bp.third?.['m103'];
  const sf1   = bp.sf?.['m101'];
  const sf2   = bp.sf?.['m102'];
  const qf97  = bp.qf?.['m97'];
  const qf98  = bp.qf?.['m98'];
  const qf99  = bp.qf?.['m99'];
  const qf100 = bp.qf?.['m100'];
  const sfLosers = [];
  if (sf1 && qf97 && qf98) sfLosers.push(sf1 === qf97 ? qf98 : qf97);
  if (sf2 && qf99 && qf100) sfLosers.push(sf2 === qf99 ? qf100 : qf99);
  return sfLosers.find(t => t !== third) || null;
};

const formatDate = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-MY', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};
