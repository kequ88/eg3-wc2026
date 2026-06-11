// src/ui/splash.js
//
// Renders the rules splash overlay and handles dismiss logic.
// The splash is shown on FIRST VISIT only — localStorage remembers
// if the user has already seen and agreed to the rules.

import { Analytics } from '../services/analytics.js';
import { switchTab } from './tabs.js';

const SEEN_KEY = 'eg3_rules_seen';

export const renderSplash = () => {
  const el = document.getElementById('rules-splash');

  el.className = 'splash-overlay';
  el.innerHTML = `
    <div class="splash-inner">
      <div class="splash-scroll">

        <div class="rules-hero splash-hero">
          <div class="rules-trophy">🏆</div>
          <h2>Neighborhood World Cup 2026<br>Prediction Tournament</h2>
          <p>Official Community Rules &amp; Guidelines</p>
          <p class="splash-sub">Elmina Green Three · EG3C</p>
        </div>

        <div class="rules-card">
          <div class="rules-section-head">🏘️ Community Rules</div>

          <div class="rules-item">
            <div class="rules-item-icon">🏠</div>
            <div><div class="rules-item-title">Entry Limit</div>
            <div class="rules-item-body">Strictly <strong>one (1) entry per household.</strong></div></div>
          </div>

          <div class="rules-item">
            <div class="rules-item-icon">✅</div>
            <div><div class="rules-item-title">Eligibility</div>
            <div class="rules-item-body">Open to active <strong>EG3C members</strong> only. <strong>100% FREE</strong> — no payment required!</div></div>
          </div>

          <div class="rules-item">
            <div class="rules-item-icon">⏰</div>
            <div><div class="rules-item-title">Deadline</div>
            <div class="rules-item-body"><strong>Friday, June 12 at 4:00 AM MYT</strong> — exactly when Mexico vs South Africa kicks off. No late entries.</div></div>
          </div>

          <div class="rules-item">
            <div class="rules-item-icon">📊</div>
            <div><div class="rules-item-title">Scoreboard Updates</div>
            <div class="rules-item-body">Refreshed <strong>daily by 3:00 PM MYT</strong> after matches complete.</div></div>
          </div>

          <div class="rules-item">
            <div class="rules-item-icon">🎯</div>
            <div><div class="rules-item-title">Tiebreakers</div>
            <div class="rules-item-body">
              <ol class="tiebreak-list">
                <li>Most correct <strong>Winner</strong> prediction</li>
                <li>Most correct <strong>Semifinalists</strong></li>
                <li>Most correct <strong>Quarterfinalists</strong></li>
                <li>Earliest submission time</li>
              </ol>
            </div></div>
          </div>

          <div class="rules-item">
            <div class="rules-item-icon">🎁</div>
            <div><div class="rules-item-title">Prizes</div>
            <div class="rules-item-body">
              Good news! <strong>EG3C will be sponsoring exciting prizes for the Top 3 players!</strong>
              <div class="prize-row">
                <span class="prize-badge gold-prize">🥇 1st</span>
                <span class="prize-badge silver-prize">🥈 2nd</span>
                <span class="prize-badge bronze-prize">🥉 3rd</span>
              </div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px">*To be announced by Timbalan Pengerusi Rasyaik</div>
            </div></div>
          </div>
        </div>

        <div class="rules-card">
          <div class="rules-section-head">📋 Quick Scoring Summary</div>
          <div class="scoring-block">
            <table class="rules-table">
              <tbody>
                <tr><td>Submitting picks</td><td class="pos-cell">+5 pts</td></tr>
                <tr><td>Your QF pick wins a group match</td><td class="pos-cell">+3 pts</td></tr>
                <tr><td>Your QF pick draws a group match</td><td class="pos-cell">+1 pt</td></tr>
                <tr><td>Your team reaches Quarter-finals</td><td class="pos-cell">+5 pts</td></tr>
                <tr><td>Your team reaches Semi-finals</td><td class="pos-cell">+8 pts</td></tr>
                <tr><td>Your team reaches the Final</td><td class="pos-cell">+12 pts</td></tr>
                <tr><td>Your team wins the World Cup</td><td class="pos-cell">+20 pts</td></tr>
                <tr><td>Wrong pick — team exits at group stage</td><td class="neg-cell">−3 to −6 pts</td></tr>
              </tbody>
            </table>
            <div class="scoring-note">Your <strong>8 Quarterfinalist picks</strong> are the anchor — everything is scored from QF onwards. Tap <strong>📋 Rules</strong> for the full scoring table.</div>
          </div>
        </div>

      </div>

      <div class="splash-agree">
        <label class="agree-label">
          <input type="checkbox" id="agree-check"
            onchange="document.getElementById('agree-btn').disabled = !this.checked"/>
          I have read and agree to the community rules above
        </label>
        <button class="btn primary" id="agree-btn" disabled
          style="width:100%;padding:13px;font-size:15px"
          onclick="App.dismissSplash()">
          Enter the Tournament ⚽
        </button>
      </div>
    </div>
  `;

  // Show only if not seen before
  if (!localStorage.getItem(SEEN_KEY)) {
    el.style.display = 'flex';
  }
};

export const dismissSplash = () => {
  localStorage.setItem(SEEN_KEY, '1');
  Analytics.splashDismissed();

  const el = document.getElementById('rules-splash');
  el.classList.add('splash-exit');
  setTimeout(() => { el.style.display = 'none'; }, 400);
};

export const renderRulesTab = () => {
  const el = document.getElementById('tab-rules');
  el.innerHTML = `
    <div class="rules-wrap">

      <div class="rules-hero">
        <div class="rules-trophy">🏆</div>
        <h2>Neighborhood World Cup 2026<br>Prediction Tournament</h2>
        <p>Official Community Rules &amp; Guidelines</p>
      </div>

      <div class="rules-card">
        <div class="rules-section-head">🏘️ Community Rules</div>

        <div class="rules-item">
          <div class="rules-item-icon">🏠</div>
          <div><div class="rules-item-title">Entry Limit</div>
          <div class="rules-item-body">Strictly <strong>one (1) entry per household.</strong> House number is validated against the EG3 resident list.</div></div>
        </div>

        <div class="rules-item">
          <div class="rules-item-icon">✅</div>
          <div><div class="rules-item-title">Eligibility</div>
          <div class="rules-item-body">Open exclusively to active <strong>EG3C members</strong>. No payment is required — it is <strong>100% FREE</strong> for all!</div></div>
        </div>

        <div class="rules-item">
          <div class="rules-item-icon">⏰</div>
          <div><div class="rules-item-title">Submission Deadline</div>
          <div class="rules-item-body">Submissions close strictly on <strong>Friday, June 12 at 4:00 AM Malaysian Time</strong> — exactly when the opening match between host Mexico and South Africa kicks off at Estadio Azteca. <strong>No late entries.</strong></div></div>
        </div>

        <div class="rules-item">
          <div class="rules-item-icon">📊</div>
          <div><div class="rules-item-title">Scoreboard Updates</div>
          <div class="rules-item-body">Leaderboards are refreshed <strong>daily by 3:00 PM MYT</strong> after the previous day's matches conclude. During the group stage, matches run late into the Malaysian night (midnight to early morning), so scores are tallied and published the following afternoon.</div></div>
        </div>

        <div class="rules-item">
          <div class="rules-item-icon">🎯</div>
          <div><div class="rules-item-title">Tiebreaker Rules</div>
          <div class="rules-item-body">
            In the event of a tie, winners are determined in this strict order:
            <ol class="tiebreak-list">
              <li>Whoever correctly predicted the overall <strong>World Cup Winner</strong></li>
              <li>Whoever correctly predicted the most <strong>Semifinalists</strong></li>
              <li>Whoever correctly predicted the most <strong>Quarterfinalists</strong></li>
              <li>Whoever submitted their entry <strong>earliest</strong> (timestamped)</li>
            </ol>
          </div></div>
        </div>

        <div class="rules-item">
          <div class="rules-item-icon">🎁</div>
          <div><div class="rules-item-title">Prizes</div>
          <div class="rules-item-body">Good news! <strong>EG3C will be sponsoring exciting prizes for the Top 3 players!</strong>
            <div class="prize-row">
              <span class="prize-badge gold-prize">🥇 1st Place</span>
              <span class="prize-badge silver-prize">🥈 2nd Place</span>
              <span class="prize-badge bronze-prize">🥉 3rd Place</span>
            </div>
            <div style="font-size:12px;color:var(--muted);margin-top:6px">*Prizes to be announced by Timbalan Pengerusi Rasyaik</div>
          </div></div>
        </div>
      </div>

      <div class="rules-card">
        <div class="rules-section-head">❓ Why No Round of 32 Scoring? — The Walkover Explained</div>
        <div class="rules-item-body" style="font-size:13px;color:var(--muted);line-height:1.7">
          <p style="margin-bottom:10px">FIFA's 2026 World Cup expanded from 32 to <strong>48 teams</strong> — the biggest tournament in history. This introduced a new Round of 32 where the 8 best third-place finishers across 12 groups advance. Which 8 teams qualify, and which specific knockout slots they fill, depends on a complex matrix of <strong>495 possible combinations</strong>.</p>
          <p style="margin-bottom:10px">To keep the game <strong>fair, fun and complexity-free</strong> for everyone, we introduced the <strong>Walkover Rule</strong>:</p>
          <ul style="margin-left:16px;margin-bottom:10px;line-height:1.8">
            <li>The 8 group winners drawn against a third-place team are awarded an <strong>automatic Walkover</strong> — they advance straight to the Round of 16 without a prediction needed.</li>
            <li>The 8 Round of 32 matches between second-place teams are <strong>fully playable</strong> — you pick the winner of each.</li>
            <li><strong>No points are awarded or deducted for Round of 32 outcomes.</strong></li>
          </ul>
          <p>This means everyone competes on equal footing, regardless of which third-place teams happened to qualify.</p>
        </div>
      </div>

      <div class="rules-card">
        <div class="rules-section-head">📋 Complete Scoring System</div>

        <div class="scoring-block">
          <div class="scoring-label">🎟️ Participation Bonus</div>
          <table class="rules-table">
            <thead><tr><th>Action</th><th>Points</th></tr></thead>
            <tbody><tr><td>Submitting your predictions before the deadline</td><td class="pos-cell">+5 pts</td></tr></tbody>
          </table>
        </div>

        <div class="scoring-block">
          <div class="scoring-label">⚽ Phase 1 — Group Stage Bonus (your 8 QF picks)</div>
          <table class="rules-table">
            <thead><tr><th>Result</th><th>Points</th></tr></thead>
            <tbody>
              <tr><td>Your picked team wins a group match</td><td class="pos-cell">+3 pts</td></tr>
              <tr><td>Your picked team draws a group match</td><td class="pos-cell">+1 pt</td></tr>
              <tr><td>Your picked team loses a group match</td><td class="muted-cell">0 pts</td></tr>
            </tbody>
          </table>
          <div class="scoring-note">Applied to all 8 of your Quarterfinalist picks. Max +72 pts (8 teams × 3 wins × 3pts).</div>
        </div>

        <div class="scoring-block">
          <div class="scoring-label">🏆 Phase 2 — Knockout Stage (your 8 QF picks are the anchor)</div>
          <table class="rules-table">
            <thead><tr><th>Milestone</th><th>Points per correct team</th><th>Max total</th></tr></thead>
            <tbody>
              <tr><td>Team reaches Quarter-finals</td><td class="pos-cell">+5 pts</td><td class="pos-cell">+40 pts</td></tr>
              <tr><td>Team reaches Semi-finals</td><td class="pos-cell">+8 pts</td><td class="pos-cell">+32 pts</td></tr>
              <tr><td>Team reaches the Final</td><td class="pos-cell">+12 pts</td><td class="pos-cell">+24 pts</td></tr>
              <tr><td>Team wins the World Cup</td><td class="pos-cell">+20 pts</td><td class="pos-cell">+20 pts</td></tr>
              <tr><td>Team wins 3rd Place Match</td><td class="pos-cell">+8 pts</td><td class="pos-cell">+8 pts</td></tr>
              <tr><td>Knockout round win (any QF pick)</td><td class="pos-cell">+5 pts/win</td><td class="pos-cell">varies</td></tr>
            </tbody>
          </table>
          <div class="scoring-note">Points are cumulative — a team that wins the whole tournament earns you +5+8+12+20 = <strong>+45 pts</strong> plus knockout win bonuses.</div>
        </div>

        <div class="scoring-block">
          <div class="scoring-label">🔴 Negative Points — When Predictions Go Wrong</div>
          <div style="overflow-x:auto">
            <table class="rules-table">
              <thead><tr><th>Eliminated at…</th><th>As QF pick</th><th>As SF pick</th><th>As Finalist</th><th>As Winner</th></tr></thead>
              <tbody>
                <tr><td>Group stage</td><td class="neg-cell">−3</td><td class="neg-cell">−4</td><td class="neg-cell">−5</td><td class="neg-cell">−6</td></tr>
                <tr><td>Round of 32 / R16</td><td class="neg-cell">−2</td><td class="neg-cell">−3</td><td class="neg-cell">−4</td><td class="neg-cell">−5</td></tr>
                <tr><td>Quarter-finals</td><td class="muted-cell">—</td><td class="neg-cell">−2</td><td class="neg-cell">−3</td><td class="neg-cell">−4</td></tr>
                <tr><td>Semi-finals</td><td class="muted-cell">—</td><td class="muted-cell">—</td><td class="neg-cell">−1</td><td class="neg-cell">−2</td></tr>
                <tr><td>Final</td><td class="muted-cell">—</td><td class="muted-cell">—</td><td class="muted-cell">—</td><td class="neg-cell">−1</td></tr>
              </tbody>
            </table>
          </div>
          <div class="scoring-note">Bigger penalty for bolder wrong predictions. If your picked Winner exits in the group stage, that's −6 pts.</div>
        </div>

        <div class="scoring-block">
          <div class="scoring-label">📊 Estimated Score Range</div>
          <table class="rules-table">
            <tbody>
              <tr><td>Perfect prediction + all wins</td><td class="pos-cell">~+220 pts</td></tr>
              <tr><td>Good prediction</td><td class="pos-cell">+80 to +130 pts</td></tr>
              <tr><td>Average prediction</td><td>+30 to +80 pts</td></tr>
              <tr><td>Worst case (all 8 QF picks exit group stage)</td><td class="neg-cell">~ −15 pts</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <button class="btn primary rules-cta" onclick="App.switchTab('pick')">
        I Understand — Let Me Play! ⚽
      </button>

    </div>
  `;
};

