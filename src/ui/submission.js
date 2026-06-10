// src/ui/submission.js
//
// Orchestrates the full 3-step submission flow:
//   Identity  → name + house number + avatar
//   Step 1    → group stage (groups.js)
//   Step 2    → round of 32 (r32.js)
//   Step 3    → full bracket (bracket.js)
//   Success   → confirmation screen
//
// Also handles:
//   - Deadline enforcement (form hidden after June 12 01:00 MYT)
//   - Auto-resume: if house has a draft in Firestore, resume from last step
//   - Auto-save: each step saves progress so browser close doesn't lose work

import { LANES, validateHouse } from '../data/houses.js';
import { compressImage }        from '../services/image.js';
import { loadDraft, autoSave }  from '../services/firestore.js';
import { isPastDeadline }       from './tabs.js';
import {
  renderGroupsStep, pickGroupTeam,
  groupsNext, getGroupStandings,
} from './groups.js';
import {
  renderR32Step, pickR32,
  r32Next, getR32Picks,
} from './r32.js';
import {
  renderBracketStep, pickBracket,
  bracketSubmit, getBracketPicks,
} from './bracket.js';

// ── MODULE STATE ──────────────────────────────────────────────
let currentStep    = 'identity'; // identity | groups | r32 | bracket | done
let currentHouseId = null;
let pendingAvatar  = null;
let userName       = null;

// ── RENDER PICK TAB ───────────────────────────────────────────
export const renderPicksTab = () => {
  const el = document.getElementById('tab-pick');
  if (!el) return;

  if (isPastDeadline()) {
    el.innerHTML = `
      <div class="closed-box">
        <h3>🔒 Submissions are closed</h3>
        <p>The World Cup has started — no more picks allowed.<br>
           Check the leaderboard to follow scores!</p>
        <button class="btn primary" style="margin-top:12px;max-width:220px"
          onclick="App.switchTab('board')">View Leaderboard →</button>
      </div>`;
    return;
  }

  el.innerHTML = buildIdentityScreen();

  // Wire avatar input
  document.getElementById('avatar-input')
    ?.addEventListener('change', handleAvatarUpload);
};

// ── IDENTITY SCREEN ───────────────────────────────────────────
const buildIdentityScreen = () => `
  <div id="screen-identity">
    <div class="card">
      <label class="field-label">Profile photo (optional)</label>
      <div class="avatar-upload-wrap">
        <label for="avatar-input" class="avatar-upload-box">
          <span id="avatar-placeholder">📷</span>
          <img id="avatar-preview" alt="Your photo"
            style="width:64px;height:64px;object-fit:cover;display:none;border-radius:50%"/>
        </label>
        <div class="avatar-upload-label">
          <strong>Add a profile photo</strong>
          Tap the circle to choose from your device
        </div>
      </div>
      <input type="file" id="avatar-input" accept="image/*" style="display:none"/>

      <label class="field-label" style="margin-top:12px">Your name</label>
      <input type="text" id="submitter-name"
        placeholder="e.g. Ahmad, Siti, Raj…"
        style="margin-bottom:12px"
        oninput="App.identityChanged()"/>

      <label class="field-label">Your house</label>
      <div class="house-row">
        <select id="lane-sel" onchange="App.identityChanged()">
          <option value="">Select lane…</option>
          ${LANES.map(l =>
            `<option value="${l}">${l.replace('L', 'Lane ')}</option>`
          ).join('')}
        </select>
        <input type="number" id="house-num"
          placeholder="House No." min="1" max="99"
          oninput="App.identityChanged()"/>
      </div>
      <p style="font-size:11px;color:var(--muted)">
        ⚠️ One submission per house. Validated against the EG3 resident list.
      </p>
    </div>

    <div id="resume-banner-wrap"></div>

    <button class="btn primary btn-full" id="btn-start"
      onclick="App.identityNext()" disabled>
      Start Predictions →
    </button>
    <div class="msg" id="identity-msg"></div>
  </div>

  <!-- Step containers — hidden until activated -->
  <div id="step-groups"  style="display:none"></div>
  <div id="step-r32"     style="display:none"></div>
  <div id="step-bracket" style="display:none"></div>
  <div id="screen-done"  style="display:none"></div>
`;

// ── AVATAR UPLOAD ─────────────────────────────────────────────
const handleAvatarUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  pendingAvatar = await compressImage(file);
  const preview = document.getElementById('avatar-preview');
  if (preview) {
    preview.src = pendingAvatar;
    preview.style.display = 'block';
    document.getElementById('avatar-placeholder').style.display = 'none';
  }
};

// ── IDENTITY VALIDATION ───────────────────────────────────────
export const identityChanged = () => {
  const houseId = validateHouse(
    document.getElementById('lane-sel')?.value,
    document.getElementById('house-num')?.value
  );
  const name = document.getElementById('submitter-name')?.value.trim();
  const btn  = document.getElementById('btn-start');
  if (btn) btn.disabled = !houseId || !name;

  // Check for existing draft when valid house is entered
  if (houseId && houseId !== currentHouseId) {
    currentHouseId = houseId;
    checkForDraft(houseId);
  }
};

// ── CHECK FOR DRAFT (resume) ──────────────────────────────────
const checkForDraft = async (houseId) => {
  const draft = await loadDraft(houseId);
  const wrap  = document.getElementById('resume-banner-wrap');
  if (!wrap) return;

  if (draft) {
    const stepLabel = {
      groups:  'Group Stage',
      r32:     'Round of 32',
      bracket: 'Bracket',
    }[draft.progress] || 'your predictions';

    wrap.innerHTML = `
      <div class="resume-banner">
        <div class="resume-text">
          <strong>🔄 Draft found!</strong>
          You were halfway through the ${stepLabel} step.
        </div>
        <button class="btn primary" style="flex-shrink:0;padding:8px 14px;font-size:13px"
          onclick="App.resumeDraft()">Resume →</button>
      </div>`;
  } else {
    wrap.innerHTML = '';
  }
};

// ── RESUME DRAFT ──────────────────────────────────────────────
export const resumeDraft = async () => {
  const houseId = validateHouse(
    document.getElementById('lane-sel')?.value,
    document.getElementById('house-num')?.value
  );
  if (!houseId) return;

  const draft = await loadDraft(houseId);
  if (!draft) return;

  currentHouseId = houseId;
  userName       = document.getElementById('submitter-name')?.value.trim()
                   || draft.name || 'Neighbour';

  // Resume from saved progress
  goToStep(draft.progress || 'groups', draft);
};

// ── IDENTITY NEXT ─────────────────────────────────────────────
export const identityNext = async () => {
  const name    = document.getElementById('submitter-name')?.value.trim();
  const houseId = validateHouse(
    document.getElementById('lane-sel')?.value,
    document.getElementById('house-num')?.value
  );

  if (!name)    { showMsg('identity-msg', 'Please enter your name.');                      return; }
  if (!houseId) { showMsg('identity-msg', 'Please select a valid lane and house number.'); return; }

  currentHouseId = houseId;
  userName       = name;

  // Save identity immediately so draft exists
  await autoSave(houseId, {
    name,
    avatar:   pendingAvatar || null,
    progress: 'groups',
  });

  goToStep('groups');
};

// ── STEP ROUTER ───────────────────────────────────────────────
const goToStep = (step, draft = null) => {
  currentStep = step;

  // Hide all step containers
  ['screen-identity', 'step-groups', 'step-r32', 'step-bracket', 'screen-done']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

  // Always prefer live module state — draft only used on first resume
  const liveStandings = getGroupStandings();
  const liveR32       = getR32Picks();
  const liveBracket   = getBracketPicks();
  const standings = Object.keys(liveStandings).length ? liveStandings : (draft?.groupStandings || {});
  const r32p      = Object.keys(liveR32).length       ? liveR32       : (draft?.r32picks       || {});
  const bracketP  = Object.keys(liveBracket?.r16 || {}).length ? liveBracket : (draft?.bracketPicks || {});

  switch (step) {
    case 'groups':
      show('step-groups');
      renderGroupsStep(currentHouseId, draft?.groupStandings || liveStandings);
      break;

    case 'r32':
      show('step-r32');
      renderR32Step(currentHouseId, standings, r32p);
      break;

    case 'bracket':
      show('step-bracket');
      renderBracketStep(currentHouseId, standings, r32p, bracketP);
      break;

    case 'done':
      show('screen-done');
      renderSuccessScreen(draft);
      break;

    default:
      show('screen-identity');
  }
};

// ── GROUPS → R32 ──────────────────────────────────────────────
export const groupsNextStep = () => {
  const standings = groupsNext(); // non-blocking now
  if (!standings) return;
  goToStep('r32');
};

// ── R32 BACK ──────────────────────────────────────────────────
export const r32Back = () => goToStep('groups');

// ── R32 → BRACKET ─────────────────────────────────────────────
export const r32NextStep = () => {
  const r32p = r32Next(); // non-blocking now
  if (!r32p) return;
  goToStep('bracket');
};

// ── BRACKET BACK ─────────────────────────────────────────────
export const bracketBack = () => {
  const standings = getGroupStandings();
  const r32p      = getR32Picks();
  goToStep('r32');
};

// ── BRACKET SUBMIT ────────────────────────────────────────────
export const bracketSubmitStep = async () => {
  const ok = await bracketSubmit();
  if (ok) {
    const standings = getGroupStandings();
    const r32p      = getR32Picks();
    const bp        = getBracketPicks();
    goToStep('done', {
      name:          userName,
      groupStandings: standings,
      r32picks:       r32p,
      bracketPicks:   bp,
    });
  }
};

// ── SUCCESS SCREEN ────────────────────────────────────────────
const renderSuccessScreen = (draft) => {
  const el = document.getElementById('screen-done');
  if (!el) return;

  const winner = draft?.bracketPicks?.final?.['m104'] || '—';

  el.innerHTML = `
    <div class="success-screen">
      <div class="success-trophy">🎉</div>
      <div class="success-title">You're in, ${draft?.name || 'Neighbour'}!</div>
      <div class="success-sub">
        Your predictions are locked in.<br>
        The leaderboard goes live when the tournament starts on June 12.
      </div>

      <div class="success-picks">
        <div class="success-pick-row">
          <span class="success-pick-label">Your World Cup Winner</span>
          <strong>${winner}</strong>
        </div>
        <div class="success-pick-row">
          <span class="success-pick-label">Submission deadline</span>
          <span>June 12, 12:30 AM MYT</span>
        </div>
      </div>

      <button class="btn primary btn-full"
        onclick="App.switchTab('board')">
        View Leaderboard 🏅
      </button>
    </div>`;
};

// ── HELPERS ───────────────────────────────────────────────────
const show = (id) => {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
};

const showMsg = (id, text, color = 'var(--red)') => {
  const el = document.getElementById(id);
  if (el) { el.textContent = text; el.style.color = color; }
};

// Re-export step handlers so main.js can attach to window.App
export { pickGroupTeam, pickR32, pickBracket };
