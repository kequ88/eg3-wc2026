// src/ui/groups.js
// Step 1: Group Stage UI
// User taps 1st place (gold), then 2nd place (silver) for each group.
// Auto-saves to Firestore after all 12 groups are complete.

import { GROUPS, GROUP_NAMES } from '../data/bracket.js';
import { findTeam }            from '../data/teams.js';
import { autoSave }            from '../services/firestore.js';
import { Analytics }           from '../services/analytics.js';

// Module state
let groupStandings = {}; // { A: {first, second}, ... }
let currentHouseId = null;

// ── RENDER ────────────────────────────────────────────────────
export const renderGroupsStep = (houseId, existingStandings = {}) => {
  currentHouseId   = houseId;
  groupStandings   = { ...existingStandings };

  const el = document.getElementById('step-groups');
  if (!el) return;

  el.innerHTML = `
    <div class="step-header">
      <div class="step-title">Step 1 of 3 — Predict the Group Stage</div>
      <div class="step-sub">
        Tap <span class="badge-gold">1st</span> then
        <span class="badge-silver">2nd</span> for each group.
        Your choices lock the bracket pathways.
      </div>
    </div>

    <div class="groups-progress-bar">
      <div class="groups-progress-fill" id="groups-progress-fill"
        style="width:${(Object.keys(groupStandings).length/12)*100}%"></div>
    </div>
    <div class="groups-progress-label" id="groups-progress-label">
      ${Object.keys(groupStandings).length} / 12 groups predicted
    </div>

    <div class="groups-grid" id="groups-grid"></div>

    <button class="btn primary btn-full" id="btn-groups-next"
      onclick="App.groupsNext()"
      ${Object.keys(groupStandings).length === 12 ? '' : 'disabled'}>
      Next — Round of 32 →
    </button>
    <div class="msg" id="groups-msg"></div>
  `;

  renderAllGroupCards();
};

// ── RENDER ALL GROUP CARDS ────────────────────────────────────
const renderAllGroupCards = () => {
  const grid = document.getElementById('groups-grid');
  if (!grid) return;
  grid.innerHTML = GROUP_NAMES.map(g => buildGroupCard(g)).join('');
};

const buildGroupCard = (groupKey) => {
  const teams    = GROUPS[groupKey];
  const standing = groupStandings[groupKey] || {};
  const first    = standing.first  || null;
  const second   = standing.second || null;
  const done     = first && second;

  const teamsHtml = teams.map(name => {
    const t    = findTeam(name) || { f: '🏳', n: name };
    const role = first === name ? 'first' : second === name ? 'second' : '';
    const cls  = role === 'first'  ? ' selected-first'
               : role === 'second' ? ' selected-second' : '';

    return `
      <button class="group-team-btn${cls}"
        data-group="${groupKey}" data-team="${name}"
        onclick="App.pickGroupTeam('${groupKey}','${name}')">
        <span class="gt-flag">${t.f}</span>
        <span class="gt-name">${name}</span>
        ${role === 'first'  ? '<span class="gt-badge badge-gold">1st</span>'   : ''}
        ${role === 'second' ? '<span class="gt-badge badge-silver">2nd</span>' : ''}
      </button>`;
  }).join('');

  return `
    <div class="group-card ${done ? 'group-done' : ''}" id="group-card-${groupKey}">
      <div class="group-card-header">
        <span class="group-label">Group ${groupKey}</span>
        ${done ? '<span class="group-done-badge">✓ Done</span>' : ''}
      </div>
      <div class="group-teams">${teamsHtml}</div>
    </div>`;
};

// ── PICK HANDLER ──────────────────────────────────────────────
export const pickGroupTeam = (groupKey, teamName) => {
  const standing = groupStandings[groupKey] || {};

  if (!standing.first) {
    // First tap → set as 1st place
    groupStandings[groupKey] = { first: teamName, second: null };

  } else if (standing.first === teamName) {
    // Tap same team again → deselect
    groupStandings[groupKey] = { first: null, second: null };

  } else if (!standing.second) {
    // Second tap → set as 2nd place
    if (standing.first !== teamName) {
      groupStandings[groupKey] = { first: standing.first, second: teamName };
    }

  } else if (standing.second === teamName) {
    // Tap 2nd place team → deselect 2nd only
    groupStandings[groupKey] = { first: standing.first, second: null };

  } else {
    // Tap a different team when both slots filled → reset group
    groupStandings[groupKey] = { first: teamName, second: null };
  }

  // Re-render just this card (fast, no full re-render)
  const card = document.getElementById(`group-card-${groupKey}`);
  if (card) card.outerHTML = buildGroupCard(groupKey);

  updateGroupsProgress();
  autoSaveGroups();
};

// ── PROGRESS ──────────────────────────────────────────────────
const updateGroupsProgress = () => {
  const done = Object.values(groupStandings)
    .filter(s => s?.first && s?.second).length;

  const fill  = document.getElementById('groups-progress-fill');
  const label = document.getElementById('groups-progress-label');
  const btn   = document.getElementById('btn-groups-next');

  if (fill)  fill.style.width  = `${(done / 12) * 100}%`;
  if (label) label.textContent = `${done} / 12 groups predicted`;
  if (btn)   btn.disabled      = done < 12;
};

// ── AUTO-SAVE ─────────────────────────────────────────────────
let saveTimer = null;
const autoSaveGroups = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!currentHouseId) return;
    const complete = Object.values(groupStandings)
      .filter(s => s?.first && s?.second).length === 12;
    await autoSave(currentHouseId, {
      groupStandings,
      progress: complete ? 'r32' : 'groups',
    });
  }, 800); // debounce 800ms — don't hammer Firestore on every tap
};

// ── NEXT STEP ─────────────────────────────────────────────────
export const groupsNext = async () => {
  const complete = Object.values(groupStandings)
    .filter(s => s?.first && s?.second).length === 12;
  if (!complete) return;

  await autoSave(currentHouseId, { groupStandings, progress: 'r32' });
  Analytics.tabViewed('r32');
  return groupStandings; // caller uses this to advance step
};

export const getGroupStandings = () => ({ ...groupStandings });
