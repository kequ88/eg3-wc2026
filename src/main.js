// src/main.js — APPLICATION ENTRY POINT (full bracket version)
//
// Imports all modules, renders the shell, exposes window.App.
// This is the ONLY file that writes to window.

// ── STYLES ───────────────────────────────────────────────────
import './styles/main.css';
import './styles/components.css';
import './styles/leaderboard.css';
import './styles/teams.css';
import './styles/picks.css';

// ── UI MODULES ────────────────────────────────────────────────
import {
  renderHeader, renderTabs, renderSections,
  switchTab, registerTabCallback,
  updateDeadlineBanner,
} from './ui/tabs.js';

import { renderSplash, dismissSplash, renderRulesTab } from './ui/splash.js';
import { renderLeaderboard, setBoardRound }            from './ui/leaderboard.js';
import { renderProfile }                               from './ui/profile.js';
import { renderTeamsPage, filterTeamsPage }            from './ui/teams-page.js';

import {
  renderPicksTab,
  identityChanged, identityNext,
  resumeDraft,
  groupsNextStep, r32Back, r32NextStep,
  bracketBack, bracketSubmitStep,
  pickGroupTeam, pickR32, pickBracket,
} from './ui/submission.js';

// ── BOOT SEQUENCE ─────────────────────────────────────────────
renderHeader();
renderTabs();
renderSections();

renderPicksTab();
renderRulesTab();
renderSplash();

registerTabCallback('board',   renderLeaderboard);
registerTabCallback('teams',   renderTeamsPage);
registerTabCallback('profile', () => {
  if (currentProfileId) renderProfile(currentProfileId);
});

updateDeadlineBanner();
setInterval(updateDeadlineBanner, 60_000);

// ── PROFILE STATE ─────────────────────────────────────────────
let currentProfileId = null;

// ── WINDOW.APP ────────────────────────────────────────────────
window.App = {

  // Navigation
  switchTab(tabId) {
    if (tabId !== 'profile') {
      const pt = document.getElementById('profile-tab');
      if (pt) pt.style.display = 'none';
    }
    switchTab(tabId);
  },

  // Splash / rules
  dismissSplash,

  // ── IDENTITY STEP ──────────────────────────────────────────
  identityChanged,
  identityNext,
  resumeDraft,

  // ── GROUPS STEP ────────────────────────────────────────────
  pickGroupTeam,
  groupsNext: groupsNextStep,

  // ── R32 STEP ───────────────────────────────────────────────
  pickR32,
  r32Back,
  r32Next: r32NextStep,

  // ── BRACKET STEP ───────────────────────────────────────────
  pickBracket,
  bracketBack,
  bracketSubmit: bracketSubmitStep,

  // ── LEADERBOARD ────────────────────────────────────────────
  setBoardRound,

  // ── PROFILE ────────────────────────────────────────────────
  openProfile(houseId) {
    currentProfileId = houseId;
    const pt = document.getElementById('profile-tab');
    if (pt) pt.style.display = '';
    renderProfile(houseId);
    switchTab('profile');
  },

  // ── TEAMS ──────────────────────────────────────────────────
  filterTeamsPage,
};
