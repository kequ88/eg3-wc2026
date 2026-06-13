// src/main.js — APPLICATION ENTRY POINT (full bracket version)
//
// Picks tab removed — submissions closed, tournament underway.

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

import { renderRulesTab }                              from './ui/splash.js';
import { renderLeaderboard, setBoardRound }            from './ui/leaderboard.js';
import { renderProfile }                               from './ui/profile.js';
import { renderTeamsPage, filterTeamsPage }            from './ui/teams-page.js';

import { warmupFirestore } from './services/firestore.js';
import { renderMyBracket } from './ui/my-bracket.js';

// ── BOOT SEQUENCE ─────────────────────────────────────────────
renderHeader();
renderTabs();
renderSections();

renderRulesTab();

registerTabCallback('board',     renderLeaderboard);
registerTabCallback('teams',     renderTeamsPage);
registerTabCallback('mybracket', renderMyBracket);
registerTabCallback('profile', () => {
  if (currentProfileId) renderProfile(currentProfileId);
});

updateDeadlineBanner();

// Warm up Firestore connection immediately on load
warmupFirestore();

// Trigger leaderboard on boot since it's now the default tab
renderLeaderboard();

// ── REVEAL MY BRACKET TAB if user has submitted ──────────────
const revealMyBracketTab = () => {
  const myHouse = localStorage.getItem('eg3_my_house');
  const tab = document.getElementById('mybracket-tab');
  if (tab && myHouse) tab.style.display = '';
};
revealMyBracketTab();

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
