// src/services/analytics.js
//
// WHY WRAP GA4 IN A SERVICE?
//   If you call gtag() directly in every UI file, and Google ever
//   changes their API (or you switch to a different analytics tool),
//   you'd have to hunt down every call across the entire codebase.
//   Wrapping it here means ONE file to update.
//
// PATTERN: thin wrapper functions with descriptive names.
//   Instead of: gtag('event', 'tab_viewed', { tab_name: 'board' })
//   You write:  Analytics.tabViewed('board')
//   Much more readable, and the event name is enforced consistently.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Safe gtag call — silently does nothing if GA hasn't loaded yet.
const track = (eventName, params = {}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
};

export const Analytics = {
  // Fired when user ticks checkbox and clicks "Enter the Tournament"
  splashDismissed: () =>
    track('splash_dismissed'),

  // Fired when user clicks "I Understand" from the Rules tab
  rulesCTAClicked: () =>
    track('rules_cta_clicked'),

  // Fired on every tab switch — tells you which tabs people actually use
  tabViewed: (tabName) =>
    track('tab_viewed', { tab_name: tabName }),

  // Fired on successful Firestore write — true conversion event
  pickSubmitted: (houseId, winnerPick) =>
    track('pick_submitted', { house_id: houseId, winner_pick: winnerPick }),

  // Fired when someone clicks a neighbour's profile card
  profileViewed: (houseId) =>
    track('profile_viewed', { house_id: houseId }),

  // Fired when someone switches leaderboard round tabs
  leaderboardRoundViewed: (round) =>
    track('leaderboard_round_viewed', { round }),

  // Fired when someone searches on the teams page
  teamsSearched: (query) =>
    track('teams_searched', { query }),
};
