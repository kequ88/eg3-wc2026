// src/ui/tabs.js
//
// Manages tab switching and the deadline countdown banner.
// Imported by main.js and called by other UI modules via the
// onTabSwitch callback pattern.

import { Analytics } from '../services/analytics.js';

// ── DEADLINE ──────────────────────────────────────────────────
// June 12 2026 01:00 MYT = June 11 17:00 UTC
// June 12 2026 04:00 MYT = June 11 20:00 UTC (Mexico vs South Africa kickoff)
export const DEADLINE = new Date('2026-06-11T20:00:00Z');
export const isPastDeadline = () => new Date() >= DEADLINE;

// Update the deadline banner text and colour.
export const updateDeadlineBanner = () => {
  const banner = document.getElementById('deadline-banner');
  if (!banner) return;

  if (isPastDeadline()) {
    banner.textContent =
      '🔒 Submissions closed — tournament has started! Scores update as rounds complete.';
    banner.classList.add('closed');
  } else {
    const diff = DEADLINE - new Date();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    banner.textContent =
      `⏳ Picks close in ${d}d ${h}h ${m}m — before the opening match!`;
  }
};

// ── TAB SWITCHER ──────────────────────────────────────────────

// Callbacks registered by other UI modules.
// When a tab becomes active, its onActivate function runs.
const tabCallbacks = {};

export const registerTabCallback = (tabId, onActivate) => {
  tabCallbacks[tabId] = onActivate;
};

export const switchTab = (tabId) => {
  // Update tab button states
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Show/hide sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.toggle('active', section.id === `tab-${tabId}`);
  });

  // Run the tab's activation callback if registered
  if (tabCallbacks[tabId]) tabCallbacks[tabId]();

  Analytics.tabViewed(tabId);
};

// ── RENDER HEADER + TABS ──────────────────────────────────────

export const renderHeader = () => {
  const header = document.getElementById('app-header');
  header.innerHTML = `
    <h1>Elmina Green Three<br><span>World Cup 2026 Predictor</span> ⚽</h1>
    <p>Pick your semis · finalists · winner — closest to reality wins the prize!</p>
  `;
};

export const renderTabs = () => {
  const nav = document.getElementById('app-tabs');
  nav.innerHTML = `
    <button class="tab active" data-tab="pick"    onclick="App.switchTab('pick')">✏️ Picks</button>
    <button class="tab"        data-tab="board"   onclick="App.switchTab('board')">🏅 Leaderboard</button>
    <button class="tab"        data-tab="teams"   onclick="App.switchTab('teams')">🌍 Teams</button>
    <button class="tab"        data-tab="rules"      onclick="App.switchTab('rules')">📋 Rules</button>
    <button class="tab"        data-tab="mybracket"  onclick="App.switchTab('mybracket')"
      id="mybracket-tab" style="display:none">🌳 My Bracket</button>
    <button class="tab"        data-tab="profile"    onclick="App.switchTab('profile')"
      id="profile-tab" style="display:none">👤 Profile</button>
  `;
};

export const renderSections = () => {
  const main = document.getElementById('app-main');
  main.innerHTML = `
    <div id="tab-pick"    class="section active"></div>
    <div id="tab-board"   class="section"></div>
    <div id="tab-teams"   class="section"></div>
    <div id="tab-rules"   class="section"></div>
    <div id="tab-profile" class="section"></div>
    <div id="tab-mybracket" class="section"></div>
  `;
};
