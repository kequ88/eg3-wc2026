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
          <p class="splash-sub">Elmina Green Three · EG3</p>
        </div>

        <div class="rules-card">
          <div class="rules-section-head">🏘️ Community Rules</div>

          <div class="rules-item">
            <div class="rules-item-icon">🏠</div>
            <div>
              <div class="rules-item-title">Entry Limit</div>
              <div class="rules-item-body">Strictly <strong>one (1) entry per household.</strong></div>
            </div>
          </div>

          <div class="rules-item">
            <div class="rules-item-icon">✅</div>
            <div>
              <div class="rules-item-title">Eligibility</div>
              <div class="rules-item-body">Open to <strong>active EG3 members</strong> only. Monthly contribution must not be lapsed for more than <strong>two (2) months</strong> as of June 11, 2026.</div>
            </div>
          </div>

          <div class="rules-item">
            <div class="rules-item-icon">⏰</div>
            <div>
              <div class="rules-item-title">Deadline</div>
              <div class="rules-item-body"><strong>Friday, June 12 at 12:30 AM MYT.</strong> No late entries.</div>
            </div>
          </div>

          <div class="rules-item">
            <div class="rules-item-icon">📊</div>
            <div>
              <div class="rules-item-title">Scoreboard Updates</div>
              <div class="rules-item-body">Refreshed <strong>daily by 8:00 AM MYT</strong> after matches complete.</div>
            </div>
          </div>

          <div class="rules-item">
            <div class="rules-item-icon">🎁</div>
            <div>
              <div class="rules-item-title">Prizes</div>
              <div class="rules-item-body">
                Top 3 players win community prizes.
                <div class="prize-row">
                  <span class="prize-badge gold-prize">🥇 1st</span>
                  <span class="prize-badge silver-prize">🥈 2nd</span>
                  <span class="prize-badge bronze-prize">🥉 3rd</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="rules-card">
          <div class="rules-section-head">📋 Quick Scoring Summary</div>
          <div class="scoring-block">
            <table class="rules-table">
              <tbody>
                <tr><td>Submitting picks</td><td class="pos-cell">+5 pts</td></tr>
                <tr><td>Your team passes group stage</td><td class="pos-cell">+1 pt</td></tr>
                <tr><td>R16 / QF / SF / Final / Win</td><td class="pos-cell">+2 / +3 / +4 / +6 / +10</td></tr>
                <tr><td>Your team wins a group match</td><td class="pos-cell">+3 pts</td></tr>
                <tr><td>Your team draws a group match</td><td class="pos-cell">+1 pt</td></tr>
                <tr><td>Your team wins a knockout match</td><td class="pos-cell">+5 pts</td></tr>
                <tr><td>Wrong pick — team exits at group stage</td><td class="neg-cell">−3 to −5 pts</td></tr>
              </tbody>
            </table>
            <div class="scoring-note">Tap <strong>📋 Rules</strong> anytime to see the full scoring table.</div>
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
          <div class="rules-item-body">Open exclusively to <strong>active EG3 members.</strong> Members must not have lapsed their monthly contribution for more than <strong>two (2) months</strong> as of June 11, 2026.</div></div>
        </div>

        <div class="rules-item">
          <div class="rules-item-icon">⏰</div>
          <div><div class="rules-item-title">Submission Deadline</div>
          <div class="rules-item-body">Submissions close strictly on <strong>Friday, June 12 at 12:30 AM Malaysian Time</strong> — right before the opening ceremony. <strong>No late entries.</strong></div></div>
        </div>

        <div class="rules-item">
          <div class="rules-item-icon">📊</div>
          <div><div class="rules-item-title">Scoreboard Updates</div>
          <div class="rules-item-body">Leaderboards refreshed <strong>daily by 8:00 AM MYT</strong> after the previous day's matches conclude.</div></div>
        </div>

        <div class="rules-item">
          <div class="rules-item-icon">🎯</div>
          <div><div class="rules-item-title">Tiebreaker Rules</div>
          <div class="rules-item-body">
            In the event of a tie, winners are determined in this order:
            <ol class="tiebreak-list">
              <li>Whoever correctly predicted the overall <strong>World Cup Winner</strong></li>
              <li>Whoever correctly predicted the most <strong>Semifinalists</strong></li>
              <li>Whoever submitted their entry <strong>earliest</strong> (timestamped)</li>
            </ol>
          </div></div>
        </div>

        <div class="rules-item">
          <div class="rules-item-icon">🎁</div>
          <div><div class="rules-item-title">Prizes</div>
          <div class="rules-item-body">The <strong>Top 3 players</strong> on the final scoreboard win prizes from the community:
            <div class="prize-row">
              <span class="prize-badge gold-prize">🥇 1st — RM ___</span>
              <span class="prize-badge silver-prize">🥈 2nd — RM ___</span>
              <span class="prize-badge bronze-prize">🥉 3rd — RM ___</span>
            </div>
          </div></div>
        </div>
      </div>

      <div class="rules-card">
        <div class="rules-section-head">📋 Complete Scoring System</div>

        <div class="scoring-block">
          <div class="scoring-label">🎟️ Participation Bonus</div>
          <table class="rules-table">
            <thead><tr><th>Action</th><th>Points</th></tr></thead>
            <tbody><tr><td>Submitting picks before deadline</td><td class="pos-cell">+5 pts</td></tr></tbody>
          </table>
        </div>

        <div class="scoring-block">
          <div class="scoring-label">🟢 Positive — cumulative as your picked team progresses</div>
          <table class="rules-table">
            <thead><tr><th>Stage reached</th><th>That round</th><th>Running total</th></tr></thead>
            <tbody>
              <tr><td>Passes group stage</td><td class="pos-cell">+1</td><td class="pos-cell">+1</td></tr>
              <tr><td>Round of 16</td><td class="pos-cell">+2</td><td class="pos-cell">+3</td></tr>
              <tr><td>Quarter-finals</td><td class="pos-cell">+3</td><td class="pos-cell">+6</td></tr>
              <tr><td>Semi-finals</td><td class="pos-cell">+4</td><td class="pos-cell">+10</td></tr>
              <tr><td>Reaches the Final</td><td class="pos-cell">+6</td><td class="pos-cell">+16</td></tr>
              <tr><td>Wins the tournament</td><td class="pos-cell">+10</td><td class="pos-cell">+26</td></tr>
            </tbody>
          </table>
          <div class="scoring-note">Points stack — a team that wins it all earns you <strong>+26 pts</strong>.</div>
        </div>

        <div class="scoring-block">
          <div class="scoring-label">🔴 Negative — when a picked team is eliminated</div>
          <div style="overflow-x:auto">
            <table class="rules-table">
              <thead><tr><th>Eliminated at…</th><th>As Semi</th><th>As Finalist</th><th>As Winner</th></tr></thead>
              <tbody>
                <tr><td>Group stage</td><td class="neg-cell">−3</td><td class="neg-cell">−4</td><td class="neg-cell">−5</td></tr>
                <tr><td>Round of 32 / R16</td><td class="neg-cell">−2</td><td class="neg-cell">−3</td><td class="neg-cell">−4</td></tr>
                <tr><td>Quarter-finals</td><td class="neg-cell">−1</td><td class="neg-cell">−2</td><td class="neg-cell">−3</td></tr>
                <tr><td>Semi-finals</td><td class="muted-cell">—</td><td class="neg-cell">−1</td><td class="neg-cell">−2</td></tr>
                <tr><td>Final</td><td class="muted-cell">—</td><td class="muted-cell">—</td><td class="neg-cell">−1</td></tr>
              </tbody>
            </table>
          </div>
          <div class="scoring-note">Bigger penalty for bolder wrong predictions.</div>
        </div>

        <div class="scoring-block">
          <div class="scoring-label">⚽ Match bonus — applied to all 4 of your picked teams</div>
          <table class="rules-table">
            <thead><tr><th>Stage</th><th>Win</th><th>Draw</th><th>Loss</th></tr></thead>
            <tbody>
              <tr><td>Group stage (3 matches each)</td><td class="pos-cell">+3</td><td class="pos-cell">+1</td><td class="muted-cell">0</td></tr>
              <tr><td>All knockout rounds</td><td class="pos-cell">+5</td><td class="muted-cell">n/a</td><td class="muted-cell">0</td></tr>
            </tbody>
          </table>
          <div class="scoring-note">Max group bonus per team: <strong>+9 pts</strong>. A winning team earns <strong>+30 pts</strong> in KO bonuses alone.</div>
        </div>

        <div class="scoring-block">
          <div class="scoring-label">📊 Estimated score range</div>
          <table class="rules-table">
            <tbody>
              <tr><td>Perfect prediction + all wins</td><td class="pos-cell">~+180 pts</td></tr>
              <tr><td>Good prediction</td><td class="pos-cell">+60 to +100 pts</td></tr>
              <tr><td>Average prediction</td><td>+20 to +60 pts</td></tr>
              <tr><td>Worst case (all 4 teams exit at group stage)</td><td class="neg-cell">~ −10 pts</td></tr>
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
