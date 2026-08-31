const WEIGHTS = {
  projection: 0.45,
  matchup: 0.2,
  weather: 0.1,
  history: 0.15,
  usage: 0.1,
};

const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function scorePlayer(player, data) {
  const projection = data.projection?.points ?? 0;
  const matchup = data.matchup?.adjustment ?? 0;
  const weather = data.weather?.adjustment ?? 0;
  const history = data.history?.adjustment ?? 0;
  const usage = data.usage?.adjustment ?? 0;
  const normalizedProjection = clamp((projection / 30) * 100);
  const score = normalizedProjection * WEIGHTS.projection
    + (50 + matchup * 5) * WEIGHTS.matchup
    + (50 + weather * 5) * WEIGHTS.weather
    + (50 + history * 5) * WEIGHTS.history
    + (50 + usage * 5) * WEIGHTS.usage;

  const factors = [
    { label: "Weekly projection", value: projection, impact: "projection" },
    { label: "Matchup", value: matchup, impact: "adjustment" },
    { label: "Weather", value: weather, impact: "adjustment" },
    { label: "Opponent history", value: history, impact: "adjustment" },
    { label: "Usage trend", value: usage, impact: "adjustment" },
  ];

  return {
    ...player,
    projectedPoints: projection,
    weeklyPerformanceScore: Number(score.toFixed(1)),
    confidence: Math.round(clamp(50 + score / 2)),
    factors,
  };
}

function pickHighest(pool, position, count) {
  return pool
    .filter((player) => player.position === position)
    .slice(0, count);
}

function optimizeLineup(players, flexSpots) {
  const sorted = [...players].sort(
    (left, right) => right.weeklyPerformanceScore - left.weeklyPerformanceScore,
  );
  const starters = [
    ...pickHighest(sorted, "QB", 1),
    ...pickHighest(sorted, "RB", 2),
    ...pickHighest(sorted, "WR", 2),
    ...pickHighest(sorted, "TE", 1),
    ...pickHighest(sorted, "DST", 1),
    ...pickHighest(sorted, "K", 1),
  ];
  const selected = new Set(starters.map((player) => player.id));
  const flex = sorted
    .filter((player) => !selected.has(player.id) && FLEX_POSITIONS.has(player.position))
    .slice(0, flexSpots);

  flex.forEach((player) => selected.add(player.id));
  const lineup = [...starters, ...flex].map((player) => ({
    ...player,
    lineupSlot: flex.some((flexPlayer) => flexPlayer.id === player.id)
      ? "FLEX"
      : player.position,
  }));

  return {
    starters: lineup,
    bench: sorted.filter((player) => !selected.has(player.id)),
    projectedTotal: Number(
      lineup.reduce((total, player) => total + player.projectedPoints, 0).toFixed(1),
    ),
  };
}

module.exports = { optimizeLineup, scorePlayer };
