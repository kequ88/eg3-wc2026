// src/services/openfootball.js
//
// Responsible for fetching live match data from openfootball's
// community-maintained JSON feed and parsing it into a shape
// the scoring engine can work with.
//
// WHY ISOLATE THIS?
//   If openfootball changes their JSON structure, or you switch
//   to a paid API (API-Football, Sportmonks), only this file changes.
//   The scoring engine only ever sees the normalised output format below.
//
// OUTPUT FORMAT:
//   {
//     mdata: {
//       "Brazil": { groupWins, groupDraws, groupLosses, koWins, koLosses }
//     },
//     status: {
//       "Brazil": { reachedStage: "Semi-finals", eliminatedAt: null }
//     },
//     roundSnaps: {
//       "Group Stage": { "Brazil": { w, d, l, koW, koL } },
//       "Quarter-finals": { ... }
//     }
//   }

const OFB_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

// Stage names — must match exactly what the scoring engine expects.
export const STAGES = Object.freeze([
  'Group Stage',
  'Round of 32',
  'Round of 16',
  'Quarter-finals',
  'Semi-finals',
  'Final',
  'Winner',
]);

export const STAGE_IDX = Object.fromEntries(STAGES.map((s, i) => [s, i]));

// Map openfootball round strings to our stage names.
const roundToStage = (round = '') => {
  const r = round.toLowerCase();
  if (r.includes('matchday') || r.includes('group')) return 'Group Stage';
  if (r.includes('round of 32') || r.includes('r32'))  return 'Round of 32';
  if (r.includes('round of 16') || r.includes('r16'))  return 'Round of 16';
  if (r.includes('quarter'))  return 'Quarter-finals';
  if (r.includes('semi'))     return 'Semi-finals';
  if (r.includes('final') && !r.includes('semi') && !r.includes('third'))
    return 'Final';
  return null;
};

// Initialise a blank stats record for a team.
const blankStats = () => ({
  groupWins: 0, groupDraws: 0, groupLosses: 0,
  koWins: 0, koLosses: 0,
});

// Initialise a blank status record for a team.
const blankStatus = () => ({
  reachedStage: 'Group Stage',
  eliminatedAt: null,
});

// Determine the KO winner from a match object.
// Openfootball uses: score.ft (full time), score.et (extra time), score.p (penalties)
const koWinner = (m, t1, t2) => {
  const [s1, s2] = m.score.ft;
  if (m.score.et) {
    const [e1, e2] = m.score.et;
    return e1 > e2 ? [t1, t2] : [t2, t1]; // [winner, loser]
  }
  if (m.score.p) {
    const [p1, p2] = m.score.p;
    return p1 > p2 ? [t1, t2] : [t2, t1];
  }
  return s1 > s2 ? [t1, t2] : [t2, t1];
};

// Next stage a team advances to after winning a KO round.
const nextStage = {
  'Round of 32':  'Round of 16',
  'Round of 16':  'Quarter-finals',
  'Quarter-finals': 'Semi-finals',
  'Semi-finals':  'Final',
  'Final':        'Winner',
};

export const parseOFB = (data) => {
  const mdata      = {}; // team → aggregate stats
  const status     = {}; // team → { reachedStage, eliminatedAt }
  const roundSnaps = {}; // stage → { team → per-round stats }

  const initTeam = (name) => {
    if (!mdata[name])  mdata[name]  = blankStats();
    if (!status[name]) status[name] = blankStatus();
  };

  const initSnap = (stage, name) => {
    if (!roundSnaps[stage]) roundSnaps[stage] = {};
    if (!roundSnaps[stage][name])
      roundSnaps[stage][name] = { w: 0, d: 0, l: 0, koW: 0, koL: 0 };
  };

  for (const m of (data.matches || [])) {
    // Skip unplayed matches — no score yet
    if (!m.score?.ft) continue;

    const t1    = m.team1;
    const t2    = m.team2;
    const [s1, s2] = m.score.ft;
    const stage = roundToStage(m.round || '');
    if (!stage) continue;

    initTeam(t1); initTeam(t2);
    initSnap(stage, t1); initSnap(stage, t2);

    if (stage === 'Group Stage') {
      if (s1 > s2) {
        mdata[t1].groupWins++;   roundSnaps[stage][t1].w++;
        mdata[t2].groupLosses++; roundSnaps[stage][t2].l++;
      } else if (s1 < s2) {
        mdata[t2].groupWins++;   roundSnaps[stage][t2].w++;
        mdata[t1].groupLosses++; roundSnaps[stage][t1].l++;
      } else {
        mdata[t1].groupDraws++; roundSnaps[stage][t1].d++;
        mdata[t2].groupDraws++; roundSnaps[stage][t2].d++;
      }
    } else {
      // Knockout round — determine winner and loser
      const [winner, loser] = koWinner(m, t1, t2);

      mdata[winner].koWins++;   roundSnaps[stage][winner].koW++;
      mdata[loser].koLosses++;  roundSnaps[stage][loser].koL++;

      // Advance winner's stage
      const advance = nextStage[stage];
      if (advance && STAGE_IDX[advance] > STAGE_IDX[status[winner].reachedStage]) {
        status[winner].reachedStage = advance;
      }

      // Record loser's elimination (only first elimination counts)
      if (!status[loser].eliminatedAt) {
        status[loser].eliminatedAt = stage;
      }
    }
  }

  return { mdata, status, roundSnaps };
};

// Fetch from openfootball and parse.
// Returns the parsed result, or empty defaults on failure.
export const fetchMatchData = async () => {
  try {
    const res  = await fetch(OFB_URL);
    const data = await res.json();
    return parseOFB(data);
  } catch (err) {
    console.warn('[OFB] Fetch failed — tournament may not have started yet:', err.message);
    return { mdata: {}, status: {}, roundSnaps: {} };
  }
};

// ── SIMULATION MODE ───────────────────────────────────────────
//
// Inject fake match data to test scoring without waiting for real matches.
// Toggle SIM_MODE to true to activate.
// Set SIM_TEAMS to the names from your actual Firestore submissions.
//
// HOW TO USE:
//   1. Set SIM_MODE = true below
//   2. Edit SIM_TEAMS to match real picks in your Firestore
//   3. npm run dev and check the leaderboard
//   4. Set SIM_MODE = false before pushing to production

export const SIM_MODE = false;

// Replace these with actual team names from your submissions
const SIM_TEAMS = {
  goesToFinal:    ['Brazil',  'France'],     // reach the Final
  goesToSemis:    ['Spain',   'Argentina'],  // reach SF, eliminated there
  goesToQF:       ['Germany', 'Portugal'],   // reach QF, eliminated there
  goesToR16:      ['England', 'Japan'],      // reach R16, eliminated there
  groupExit:      ['Morocco', 'Uruguay'],    // exit in Group Stage
  winner:         'Brazil',                 // wins the whole thing
};

export const getSimData = () => {
  const mdata      = {};
  const status     = {};
  const roundSnaps = {};

  const init = (name) => {
    mdata[name]  = blankStats();
    status[name] = blankStatus();
  };

  const snap = (stage, name, field) => {
    if (!roundSnaps[stage]) roundSnaps[stage] = {};
    if (!roundSnaps[stage][name])
      roundSnaps[stage][name] = { w: 0, d: 0, l: 0, koW: 0, koL: 0 };
    roundSnaps[stage][name][field]++;
  };

  // All teams get group stage results (3 matches)
  const allTeams = [
    ...SIM_TEAMS.goesToFinal,
    ...SIM_TEAMS.goesToSemis,
    ...SIM_TEAMS.goesToQF,
    ...SIM_TEAMS.goesToR16,
    ...SIM_TEAMS.groupExit,
  ];

  allTeams.forEach(name => {
    init(name);
    // Give each team 2 wins 1 draw in group stage for bonus points
    mdata[name].groupWins   = 2;
    mdata[name].groupDraws  = 1;
    mdata[name].groupLosses = 0;
    snap('Group Stage', name, 'w');
    snap('Group Stage', name, 'w');
    snap('Group Stage', name, 'd');
  });

  // Group exits — eliminated at Group Stage
  SIM_TEAMS.groupExit.forEach(name => {
    status[name].eliminatedAt = 'Group Stage';
  });

  // R16 exits
  SIM_TEAMS.goesToR16.forEach(name => {
    status[name].reachedStage = 'Round of 16';
    status[name].eliminatedAt = 'Round of 16';
    mdata[name].koWins = 1;
    snap('Round of 32', name, 'koW');
    snap('Round of 16', name, 'koL');
  });

  // QF exits
  SIM_TEAMS.goesToQF.forEach(name => {
    status[name].reachedStage = 'Quarter-finals';
    status[name].eliminatedAt = 'Quarter-finals';
    mdata[name].koWins = 2;
    snap('Round of 32', name, 'koW');
    snap('Round of 16', name, 'koW');
    snap('Quarter-finals', name, 'koL');
  });

  // SF exits
  SIM_TEAMS.goesToSemis.forEach(name => {
    status[name].reachedStage = 'Semi-finals';
    status[name].eliminatedAt = 'Semi-finals';
    mdata[name].koWins = 3;
    snap('Round of 32', name, 'koW');
    snap('Round of 16', name, 'koW');
    snap('Quarter-finals', name, 'koW');
    snap('Semi-finals', name, 'koL');
  });

  // Finalists
  SIM_TEAMS.goesToFinal.forEach(name => {
    status[name].reachedStage = 'Final';
    mdata[name].koWins = 4;
    snap('Round of 32', name, 'koW');
    snap('Round of 16', name, 'koW');
    snap('Quarter-finals', name, 'koW');
    snap('Semi-finals', name, 'koW');
  });

  // Winner
  const w = SIM_TEAMS.winner;
  status[w].reachedStage = 'Winner';
  status[w].eliminatedAt = null;
  mdata[w].koWins = 5;
  snap('Final', w, 'koW');

  // Runner-up
  const ru = SIM_TEAMS.goesToFinal.find(n => n !== w);
  if (ru) {
    status[ru].eliminatedAt = 'Final';
    snap('Final', ru, 'koL');
  }

  return { mdata, status, roundSnaps };
};
