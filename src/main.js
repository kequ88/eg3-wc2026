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
import './styles/my-bracket.css';

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

import { warmupFirestore } from './services/firestore.js';
import { renderMyBracket } from './ui/my-bracket.js';
import {
  renderPicksTab,
  identityChanged, identityNext,
  resumeDraft, resubmit,
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
registerTabCallback('mybracket', renderMyBracket);
registerTabCallback('profile', () => {
  if (currentProfileId) renderProfile(currentProfileId);
});

updateDeadlineBanner();
setInterval(updateDeadlineBanner, 60_000);

// Warm up Firestore connection immediately on load
// so the first Next button click is instant, not 5-10 seconds
warmupFirestore();

// ── REVEAL MY BRACKET TAB if user has submitted ─────────────
const revealMyBracketTab = () => {
  const myHouse = localStorage.getItem('eg3_my_house');
  const tab = document.getElementById('mybracket-tab');
  if (tab && myHouse) tab.style.display = '';
};
revealMyBracketTab(); // check on load

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
  resubmit,

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
