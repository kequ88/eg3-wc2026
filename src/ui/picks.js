// src/ui/picks.js
//
// Manages the entire pick submission flow:
//   Step 1 — choose 4 semifinalists
//   Step 2 — choose 2 finalists (from your semis)
//   Step 3 — choose the winner (from your finalists)
//
// State is local to this module — no global variables.
// On submit, data goes to firestore.js (service layer).

import { TEAMS }         from '../data/teams.js';
import { LANES, validateHouse } from '../data/houses.js';
import { savePick }      from '../services/firestore.js';
import { compressImage } from '../services/image.js';
import { Analytics }     from '../services/analytics.js';
import { isPastDeadline, switchTab } from './tabs.js';

// ── MODULE STATE ──────────────────────────────────────────────
let step         = 1;
let semis        = [];
let finals       = [];
let winner       = null;
let pendingAvatar = null;

// ── RENDER SHELL ──────────────────────────────────────────────
export const renderPicksTab = () => {
  const el = document.getElementById('tab-pick');

  el.innerHTML = `
    <div id="closed-msg" style="display:none">
      <div class="closed-box">
        <h3>🔒 Submissions are closed</h3>
        <p>The World Cup has started — no more picks allowed.<br>
           Check the leaderboard to follow the scores!</p>
        <button class="btn primary" style="margin-top:12px;max-width:200px"
          onclick="App.switchTab('board')">View Leaderboard →</button>
      </div>
    </div>

    <div id="pick-form-wrap">
      <div class="card">
        <label class="field-label">Profile photo (optional)</label>
        <div class="avatar-upload-wrap">
          <label for="avatar-input" class="avatar-upload-box">
            <span id="avatar-placeholder">📷</span>
            <img id="avatar-preview" alt="Your photo"
              style="width:64px;height:64px;object-fit:cover;display:none;border-radius:50%"/>
          </label>
          <div class="avatar-upload-label">
            <strong>Upload a photo</strong>
            Tap the circle to choose from your device
          </div>
        </div>
        <input type="file" id="avatar-input" accept="image/*" style="display:none"/>

        <label class="field-label">Your name</label>
        <input type="text" id="submitter-name"
          placeholder="e.g. Ahmad, Siti, Raj…" style="margin-bottom:12px"/>

        <label class="field-label">Your house</label>
        <div class="house-row">
          <select id="lane-sel">
            <option value="">Select lane…</option>
            ${LANES.map(l => `<option value="${l}">${l.replace('L', 'Lane ')}</option>`).join('')}
          </select>
          <input type="number" id="house-num" placeholder="House No." min="1" max="99"/>
        </div>
        <p style="font-size:11px;color:var(--muted)">
          ⚠️ One submission per house. Your house number is validated against the EG3 resident list.
        </p>
      </div>

      <div class="step-bar">
        <div class="step-dot done"   id="d0"></div>
        <div class="step-dot active" id="d1"></div>
        <div class="step-dot"        id="d2"></div>
        <div class="step-dot"        id="d3"></div>
        <span class="step-text" id="step-label">Step 1 — pick 4 semifinalists</span>
      </div>

      <!-- Step 1: Semis -->
      <div id="step1">
        <div class="hint">Choose 4 teams you think will reach the semifinals</div>
        <div class="count-badge" id="semi-count">0 / 4 selected</div>
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="search1" placeholder="Search nation…"
            oninput="App.filterTeamGrid()"/>
        </div>
        <div class="tags" id="tags-semi"></div>
        <div class="team-grid" id="grid-semi"></div>
      </div>

      <!-- Step 2: Finals -->
      <div id="step2" style="display:none">
        <div class="hint">From your 4 semifinalists, who reaches the final?</div>
        <div class="count-badge" id="final-count">0 / 2 selected</div>
        <div class="team-grid" id="grid-final"></div>
      </div>

      <!-- Step 3: Winner -->
      <div id="step3" style="display:none">
        <div class="winner-box">
          <div class="label">🏆 Who wins it all?</div>
          <div class="team-grid" id="grid-winner" style="max-height:130px"></div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn" id="btn-back" onclick="App.prevStep()"
          style="display:none;flex:0 0 auto;padding:10px 20px">← Back</button>
        <button class="btn primary" id="btn-next" onclick="App.nextStep()" disabled>
          Next →
        </button>
        <button class="btn primary" id="btn-submit" onclick="App.submitPicks()"
          style="display:none" disabled>
          Submit 🎉
        </button>
      </div>
      <div class="msg" id="pick-msg"></div>
    </div>
  `;

  // Wire up avatar input
  document.getElementById('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pendingAvatar = await compressImage(file);
    const preview = document.getElementById('avatar-preview');
    preview.src = pendingAvatar;
    preview.style.display = 'block';
    document.getElementById('avatar-placeholder').style.display = 'none';
  });

  // Build initial team grid
  buildTeamGrid('grid-semi', TEAMS, semis, toggleSemi);

  // Check deadline
  if (isPastDeadline()) {
    document.getElementById('pick-form-wrap').style.display = 'none';
    document.getElementById('closed-msg').style.display = 'block';
  }
};

// ── TEAM GRID BUILDER ─────────────────────────────────────────
const buildTeamGrid = (containerId, teams, selectedArr, onToggle) => {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  teams.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'team-btn' + (selectedArr.includes(t.n) ? ' selected' : '');
    btn.dataset.name = t.n;
    btn.innerHTML = `<span>${t.f}</span><span>${t.n}</span>`;
    btn.addEventListener('click', () => onToggle(t, btn));
    el.appendChild(btn);
  });
};

// ── SEARCH FILTER ─────────────────────────────────────────────
export const filterTeamGrid = () => {
  const q = document.getElementById('search1')?.value.toLowerCase() || '';
  document.querySelectorAll('#grid-semi .team-btn').forEach(b => {
    b.style.display = b.dataset.name.toLowerCase().includes(q) ? '' : 'none';
  });
};

// ── TOGGLE HANDLERS ───────────────────────────────────────────
const toggleSemi = (t, btn) => {
  if (semis.includes(t.n)) {
    semis = semis.filter(x => x !== t.n);
    btn.classList.remove('selected');
  } else if (semis.length < 4) {
    semis.push(t.n);
    btn.classList.add('selected');
  }
  renderSemiTags();
  document.getElementById('semi-count').textContent = `${semis.length} / 4 selected`;
  document.getElementById('btn-next').disabled = semis.length !== 4;
};

const removeSemi = (name) => {
  semis = semis.filter(x => x !== name);
  renderSemiTags();
  document.querySelectorAll('#grid-semi .team-btn').forEach(b => {
    if (b.dataset.name === name) b.classList.remove('selected');
  });
  document.getElementById('semi-count').textContent = `${semis.length} / 4 selected`;
  document.getElementById('btn-next').disabled = semis.length !== 4;
};

// Expose removeSemi for inline onclick in tags
window._eg3RemoveSemi = removeSemi;

const renderSemiTags = () => {
  const el = document.getElementById('tags-semi');
  if (!el) return;
  el.innerHTML = '';
  semis.forEach(name => {
    const t = TEAMS.find(x => x.n === name);
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${t.f} ${name}
      <button onclick="window._eg3RemoveSemi('${name}')">×</button>`;
    el.appendChild(tag);
  });
};

const toggleFinal = (t, btn) => {
  if (finals.includes(t.n)) {
    finals = finals.filter(x => x !== t.n);
    btn.classList.remove('selected');
  } else if (finals.length < 2) {
    finals.push(t.n);
    btn.classList.add('selected');
  }
  document.querySelectorAll('#grid-final .team-btn').forEach(b =>
    b.classList.toggle('selected', finals.includes(b.dataset.name))
  );
  document.getElementById('final-count').textContent = `${finals.length} / 2 selected`;
  document.getElementById('btn-next').disabled = finals.length !== 2;
};

const toggleWinner = (t, btn) => {
  winner = t.n;
  document.querySelectorAll('#grid-winner .team-btn').forEach(b =>
    b.classList.remove('selected', 'winner-pick')
  );
  btn.classList.add('winner-pick');
  document.getElementById('btn-submit').disabled = false;
};

// ── STEP NAVIGATION ───────────────────────────────────────────
const setDot = (i, cls) => {
  const d = document.getElementById(`d${i}`);
  if (d) d.className = 'step-dot' + (cls ? ` ${cls}` : '');
};

export const nextStep = () => {
  if (step === 1) {
    if (semis.length !== 4) return;
    step = 2;
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('btn-back').style.display = '';
    document.getElementById('btn-next').disabled = true;
    document.getElementById('step-label').textContent = 'Step 2 — pick 2 finalists';
    setDot(1, 'done'); setDot(2, 'active');
    buildTeamGrid('grid-final', TEAMS.filter(t => semis.includes(t.n)), finals, toggleFinal);
    document.getElementById('final-count').textContent = `${finals.length} / 2 selected`;

  } else if (step === 2) {
    if (finals.length !== 2) return;
    step = 3;
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
    document.getElementById('btn-next').style.display = 'none';
    document.getElementById('btn-submit').style.display = '';
    document.getElementById('btn-submit').disabled = true;
    document.getElementById('step-label').textContent = 'Step 3 — crown the winner!';
    setDot(2, 'done'); setDot(3, 'active');
    buildTeamGrid('grid-winner', TEAMS.filter(t => finals.includes(t.n)), [], toggleWinner);
  }
};

export const prevStep = () => {
  if (step === 2) {
    step = 1;
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
    document.getElementById('btn-back').style.display = 'none';
    document.getElementById('btn-next').style.display = '';
    document.getElementById('btn-next').disabled = semis.length !== 4;
    document.getElementById('step-label').textContent = 'Step 1 — pick 4 semifinalists';
    setDot(1, 'active'); setDot(2, '');

  } else if (step === 3) {
    step = 2;
    document.getElementById('step3').style.display = 'none';
    document.getElementById('step2').style.display = 'block';
    document.getElementById('btn-next').style.display = '';
    document.getElementById('btn-submit').style.display = 'none';
    document.getElementById('btn-next').disabled = finals.length !== 2;
    document.getElementById('step-label').textContent = 'Step 2 — pick 2 finalists';
    setDot(2, 'active'); setDot(3, '');
  }
};

// ── SUBMIT ────────────────────────────────────────────────────
export const submitPicks = async () => {
  if (isPastDeadline()) {
    showMsg('⏰ Submissions are closed — the tournament has started!', 'var(--red)');
    return;
  }

  const name    = document.getElementById('submitter-name').value.trim();
  const lane    = document.getElementById('lane-sel').value;
  const houseNo = document.getElementById('house-num').value;

  if (!name)    { showMsg('Please enter your name.');                    return; }

  const houseId = validateHouse(lane, houseNo);
  if (!houseId) { showMsg('Please select a valid lane and house number.'); return; }
  if (!winner)  return;

  document.getElementById('btn-submit').disabled = true;
  showMsg('Saving your picks…');

  const pickData = {
    name,
    houseId,
    semis:  [...semis],
    finals: [...finals],
    winner,
    ts:     Date.now(),
    avatar: pendingAvatar || null,
  };

  const result = await savePick(houseId, pickData);

  if (!result.ok) {
    showMsg(result.msg, 'var(--red)');
    document.getElementById('btn-submit').disabled = false;
    return;
  }

  Analytics.pickSubmitted(houseId, winner);
  showMsg(`✅ Saved! Good luck ${name}! 🤞`, 'var(--green)');
  setTimeout(() => switchTab('board'), 1500);
};

const showMsg = (text, color = 'var(--muted)') => {
  const el = document.getElementById('pick-msg');
  if (el) { el.textContent = text; el.style.color = color; }
};
