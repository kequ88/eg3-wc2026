// src/services/openfootball.js
//
// Responsible for fetching live match data from football-data.org's
// community-maintained JSON feed and parsing it into a shape
// the scoring engine can work with.
//

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

// Map football-data.org stage strings to our stage names.
const stageToStage = (stage = '') => {
  switch (stage) {
    case 'GROUP_STAGE':
      return 'Group Stage';

    case 'LAST_32':
      return 'Round of 32';

    case 'LAST_16':
      return 'Round of 16';

    case 'QUARTER_FINALS':
      return 'Quarter-finals';

    case 'SEMI_FINALS':
      return 'Semi-finals';

    case 'FINAL':
      return 'Final';

    default:
      return null;
  }
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
  const et = m.score?.extraTime;

  if (
    et &&
    et.home !== null &&
    et.away !== null
  ) {
    return et.home > et.away
      ? [t1, t2]
      : [t2, t1];
  }

  const pens = m.score?.penalties;

  if (
    pens &&
    pens.home !== null &&
    pens.away !== null
  ) {
    return pens.home > pens.away
      ? [t1, t2]
      : [t2, t1];
  }

  const ft = m.score?.fullTime;

  return ft.home > ft.away
    ? [t1, t2]
    : [t2, t1];
};

// Next stage a team advances to after winning a KO round.
const nextStage = {
  'Round of 32':  'Round of 16',
  'Round of 16':  'Quarter-finals',
  'Quarter-finals': 'Semi-finals',
  'Semi-finals':  'Final',
  'Final':        'Winner',
};

export const parseFootballData = (data) => {
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
    if (m.status !== 'FINISHED' &&
        m.status !== 'AWARDED'
        ) continue;
      const t1 = m.homeTeam?.name;
      const t2 = m.awayTeam?.name;

      const s1 = m.score?.fullTime?.home;
      const s2 = m.score?.fullTime?.away;

      const stage = stageToStage(m.stage);
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

// Fetch from football-data.org and parse.
// Returns the parsed result, or empty defaults on failure.
export const fetchMatchData = async () => {
  try {
    // const res = await fetch(`${PROXY_URL}${encodeURIComponent(FD_URL)}`, {
    const res = await fetch('/api/matches');

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    console.log(data.matches[0]);

    return parseFootballData(data);
  } catch (err) {
    console.warn('[FootballData] Fetch failed:', err.message);

    return {
      mdata: {},
      status: {},
      roundSnaps: {},
    };
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
