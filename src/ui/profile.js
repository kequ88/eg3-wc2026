// src/ui/profile.js — rewritten to match new bracket scoring engine

import { findTeam }        from '../data/teams.js';
import { updateAvatar }    from '../services/firestore.js';
import { compressImage }   from '../services/image.js';
import { Analytics }       from '../services/analytics.js';
import { isPastDeadline, switchTab } from './tabs.js';
import { buildAvatar, getCachedPicks, getCachedMatchResult } from './leaderboard.js';
import { calcTotalScore, buildScoreBreakdown } from '../scoring/engine.js';

export const renderProfile = (houseId) => {
  const el = document.getElementById('tab-profile');
  el.innerHTML = `<div class="empty">⏳ Loading profile…</div>`;

  const picks  = getCachedPicks();
  const { mdata, status, roundSnaps } = getCachedMatchResult();
  const pick   = picks.find(p => p.houseId === houseId);

  if (!pick) {
    el.innerHTML = `<div class="empty">Profile not found.</div>`;
    return;
  }

  Analytics.profileViewed(houseId);

  const started    = isPastDeadline();
  const totalScore = started ? calcTotalScore(pick, mdata, status) : null;
  const breakdown  = started ? buildScoreBreakdown(pick, mdata, status) : [];
  const winner     = pick.bracketPicks?.final?.['m104'] || null;
  const wTeam      = winner ? findTeam(winner) : null;
  const avatarHtml = buildProfileAvatar(pick);

  el.innerHTML = `
    <button class="btn-back-nav" onclick="App.switchTab('board')">
      ← Back to leaderboard
    </button>

    <div class="profile-card">
      <div class="profile-header">
        ${avatarHtml}
        <div style="text-align:center;margin-top:6px">
          <label for="profile-avatar-input" class="btn-small" style="cursor:pointer">
            📷 Update photo
          </label>
          <input type="file" id="profile-avatar-input" accept="image/*" style="display:none"/>
        </div>
        <div class="profile-name">${pick.name}</div>
        <div class="profile-house">${pick.houseId}</div>
        ${started
          ? `<div class="profile-score">${totalScore} pts</div>`
          : `<div class="pts-pending" style="margin-top:8px">Picks locked ✓</div>`}
      </div>

      ${started ? buildWinnerSection(winner, wTeam) : ''}
      ${started ? buildGroupsSection(pick) : hiddenMsg()}
      ${started && breakdown.length ? buildBreakdownSection(breakdown) : ''}
    </div>`;

  // Wire avatar update
  document.getElementById('profile-avatar-input')
    ?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const b64 = await compressImage(file);
      await updateAvatar(houseId, b64);
      const cached = getCachedPicks().find(p => p.houseId === houseId);
      if (cached) cached.avatar = b64;
      renderProfile(houseId);
    });
};

// ── AVATAR (large) ────────────────────────────────────────────
const buildProfileAvatar = (pick) => {
  const initial = (pick.name || '?').charAt(0).toUpperCase();
  if (pick.avatar) {
    return `<img src="${pick.avatar}" class="profile-avatar" alt="${pick.name}"/>`;
  }
  return `<div class="profile-avatar-placeholder">${initial}</div>`;
};

// ── WINNER SECTION ────────────────────────────────────────────
const buildWinnerSection = (winner, wTeam) => {
  if (!winner) return '';
  return `
    <div class="profile-section">
      <div class="section-title">🏆 Predicted World Cup Winner</div>
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0">
        <span style="font-size:32px">${wTeam?.f ?? '🏳'}</span>
        <span style="font-size:18px;font-weight:700">${winner}</span>
      </div>
    </div>`;
};

// ── GROUPS SECTION ────────────────────────────────────────────
const buildGroupsSection = (pick) => {
  if (!pick.groupStandings) return '';
  const rows = Object.entries(pick.groupStandings).map(([grp, { first, second }]) => {
    const t1 = findTeam(first)  || { f: '🏳' };
    const t2 = findTeam(second) || { f: '🏳' };
    return `
      <tr>
        <td style="font-weight:700;color:var(--muted);font-size:12px">Group ${grp}</td>
        <td>
          <span class="gt-badge badge-gold" style="margin-right:6px">1st</span>
          ${t1.f} ${first || '—'}
        </td>
        <td>
          <span class="gt-badge badge-silver" style="margin-right:6px">2nd</span>
          ${t2.f} ${second || '—'}
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="profile-section">
      <div class="section-title">📋 Group Stage Predictions</div>
      <div style="overflow-x:auto">
        <table class="pick-table">
          <thead><tr><th>Group</th><th>1st Place</th><th>2nd Place</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
};

// ── SCORE BREAKDOWN ───────────────────────────────────────────
const buildBreakdownSection = (breakdown) => {
  const rows = breakdown.map(({ round, pts, detail }) => {
    const detailStr = detail.map(d => {
      const t = findTeam(d.team);
      return `${t?.f ?? ''} ${d.team} (${d.pts >= 0 ? '+' : ''}${d.pts})`;
    }).join(', ');

    return `
      <tr>
        <td class="round-label">${round}</td>
        <td style="font-size:12px;color:var(--muted)">${detailStr || '—'}</td>
        <td class="round-total ${pts > 0 ? 'pos' : pts < 0 ? 'neg' : ''}">
          ${pts >= 0 ? '+' : ''}${pts}
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="profile-section">
      <div class="section-title">📊 Points Breakdown</div>
      <div style="overflow-x:auto">
        <table class="breakdown-table">
          <thead>
            <tr><th>Round</th><th>Detail</th><th>Pts</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
};

const hiddenMsg = () => `
  <div style="padding:1rem 1.25rem">
    <div class="board-picks-hidden">
      🔒 Picks revealed after tournament begins (June 12)
    </div>
  </div>`;
