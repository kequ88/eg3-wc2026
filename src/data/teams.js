// src/data/teams.js
//
// SINGLE SOURCE OF TRUTH for all team data.
// This file is imported by multiple modules — scoring, UI, teams page.
// Because it's a separate file, if FIFA updates the squad list,
// you change it in ONE place and it propagates everywhere.
//
// PATTERN: Named export of a frozen array.
// Object.freeze() prevents accidental mutation elsewhere in the app.

export const TEAMS = Object.freeze([
  // ── CONMEBOL (6) ────────────────────────────────────────────
  { n: 'Argentina',          f: '🇦🇷', conf: 'CONMEBOL' },
  { n: 'Brazil',             f: '🇧🇷', conf: 'CONMEBOL' },
  { n: 'Colombia',           f: '🇨🇴', conf: 'CONMEBOL' },
  { n: 'Ecuador',            f: '🇪🇨', conf: 'CONMEBOL' },
  { n: 'Paraguay',           f: '🇵🇾', conf: 'CONMEBOL' },
  { n: 'Uruguay',            f: '🇺🇾', conf: 'CONMEBOL' },

  // ── CONCACAF (6) ────────────────────────────────────────────
  { n: 'Canada',             f: '🇨🇦', conf: 'CONCACAF' },
  { n: 'Curaçao',            f: '🇨🇼', conf: 'CONCACAF' },
  { n: 'Haiti',              f: '🇭🇹', conf: 'CONCACAF' },
  { n: 'Mexico',             f: '🇲🇽', conf: 'CONCACAF' },
  { n: 'Panama',             f: '🇵🇦', conf: 'CONCACAF' },
  { n: 'United States',      f: '🇺🇸', conf: 'CONCACAF' },

  // ── UEFA (16) ────────────────────────────────────────────────
  { n: 'Austria',            f: '🇦🇹', conf: 'UEFA' },
  { n: 'Belgium',            f: '🇧🇪', conf: 'UEFA' },
  { n: 'Bosnia-Herzegovina', f: '🇧🇦', conf: 'UEFA' },
  { n: 'Croatia',            f: '🇭🇷', conf: 'UEFA' },
  { n: 'Czechia',            f: '🇨🇿', conf: 'UEFA' },
  { n: 'England',            f: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', conf: 'UEFA' },
  { n: 'France',             f: '🇫🇷', conf: 'UEFA' },
  { n: 'Germany',            f: '🇩🇪', conf: 'UEFA' },
  { n: 'Netherlands',        f: '🇳🇱', conf: 'UEFA' },
  { n: 'Norway',             f: '🇳🇴', conf: 'UEFA' },
  { n: 'Portugal',           f: '🇵🇹', conf: 'UEFA' },
  { n: 'Scotland',           f: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', conf: 'UEFA' },
  { n: 'Spain',              f: '🇪🇸', conf: 'UEFA' },
  { n: 'Sweden',             f: '🇸🇪', conf: 'UEFA' },
  { n: 'Switzerland',        f: '🇨🇭', conf: 'UEFA' },
  { n: 'Turkey',            f: '🇹🇷', conf: 'UEFA' },

  // ── AFC (9) ──────────────────────────────────────────────────
  { n: 'Australia',          f: '🇦🇺', conf: 'AFC' },
  { n: 'Iran',               f: '🇮🇷', conf: 'AFC' },
  { n: 'Iraq',               f: '🇮🇶', conf: 'AFC' },
  { n: 'Japan',              f: '🇯🇵', conf: 'AFC' },
  { n: 'Jordan',             f: '🇯🇴', conf: 'AFC' },
  { n: 'Qatar',              f: '🇶🇦', conf: 'AFC' },
  { n: 'Saudi Arabia',       f: '🇸🇦', conf: 'AFC' },
  { n: 'South Korea',        f: '🇰🇷', conf: 'AFC' },
  { n: 'Uzbekistan',         f: '🇺🇿', conf: 'AFC' },

  // ── CAF (10) ─────────────────────────────────────────────────
  { n: 'Algeria',            f: '🇩🇿', conf: 'CAF' },
  { n: 'Cape Verde Islands', f: '🇨🇻', conf: 'CAF' },
  { n: "Ivory Coast",        f: '🇨🇮', conf: 'CAF' },
  { n: 'Congo DR',           f: '🇨🇩', conf: 'CAF' },
  { n: 'Egypt',              f: '🇪🇬', conf: 'CAF' },
  { n: 'Ghana',              f: '🇬🇭', conf: 'CAF' },
  { n: 'Morocco',            f: '🇲🇦', conf: 'CAF' },
  { n: 'Senegal',            f: '🇸🇳', conf: 'CAF' },
  { n: 'South Africa',       f: '🇿🇦', conf: 'CAF' },
  { n: 'Tunisia',            f: '🇹🇳', conf: 'CAF' },

  // ── OFC (1) ──────────────────────────────────────────────────
  { n: 'New Zealand',        f: '🇳🇿', conf: 'OFC' },
]);

// Helper — find a team by name. Used throughout the app.
// Returns undefined if not found, so callers must handle that.
export const findTeam = name => TEAMS.find(t => t.n === name);
