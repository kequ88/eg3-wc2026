// src/ui/tabs.js
//
// Manages tab switching and the deadline countdown banner.
// Imported by main.js and called by other UI modules via the
// onTabSwitch callback pattern.
//
// Picks tab removed — submissions closed, tournament underway.

import { Analytics } from '../services/analytics.js';

// ── DEADLINE ──────────────────────────────────────────────────
export const DEADLINE = new Date('2026-06-11T20:00:00Z');
export const isPastDeadline = () => new Date() >= DEADLINE;

// Banner hidden — tournament has started, no countdown needed.
export const updateDeadlineBanner = () => {
  const banner = document.getElementById('deadline-banner');
  if (!banner) return;
  banner.style.display = 'none';
};

// ── TAB SWITCHER ──────────────────────────────────────────────
const tabCallbacks = {};

export const registerTabCallback = (tabId, onActivate) => {
  tabCallbacks[tabId] = onActivate;
};

export const switchTab = (tabId) => {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.section').forEach(section => {
    section.classList.toggle('active', section.id === `tab-${tabId}`);
  });
  if (tabCallbacks[tabId]) tabCallbacks[tabId]();
  Analytics.tabViewed(tabId);
};

// ── RENDER HEADER + TABS ──────────────────────────────────────

export const renderHeader = () => {
  const header = document.getElementById('app-header');
  header.innerHTML = `
    <h1>Elmina Green Three<br>FIFA World Cup 2026</h1>
    <p>Last place eats ghost peppers. 🌶️</p>
  `;
};

export const renderTabs = () => {
  const nav = document.getElementById('app-tabs');
  nav.innerHTML = `
    <button class="tab active" data-tab="board"      onclick="App.switchTab('board')">Leaderboard</button>
    <button class="tab"        data-tab="teams"      onclick="App.switchTab('teams')">Teams</button>
    <button class="tab"        data-tab="rules"      onclick="App.switchTab('rules')">Rules</button>
    <button class="tab"        data-tab="mybracket"  onclick="App.switchTab('mybracket')"
      id="mybracket-tab" style="display:none">My Bracket</button>
    <button class="tab"        data-tab="profile"    onclick="App.switchTab('profile')"
      id="profile-tab" style="display:none">Profile</button>
  `;
};

export const renderSections = () => {
  const main = document.getElementById('app-main');
  main.innerHTML = `
    <div id="tab-board"     class="section active"></div>
    <div id="tab-teams"     class="section"></div>
    <div id="tab-rules"     class="section"></div>
    <div id="tab-profile"   class="section"></div>
    <div id="tab-mybracket" class="section"></div>
  `;
};
