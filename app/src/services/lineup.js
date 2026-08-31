/** @format */

const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPerformanceScore(player) {
  if (Number.isFinite(player.score)) return player.score;
  const projection = toNumber(player.projection);
  const confidence = Number.isFinite(player.confidence)
    ? player.confidence
    : 65;
  return Number((projection * 3.2 + confidence * 0.55).toFixed(1));
}

function pickByPosition(players, position, count) {
  return players
    .filter((player) => player.position === position)
    .slice(0, count);
}

export function optimizeLocalLineup(players, flexSpots = 1) {
  const sorted = [...players]
    .filter((player) => player && typeof player.name === "string")
    .map((player) => ({
      ...player,
      projection: toNumber(player.projection),
      score: getPerformanceScore(player),
    }))
    .sort((left, right) => right.score - left.score);

  const starters = [
    ...pickByPosition(sorted, "QB", 1),
    ...pickByPosition(sorted, "RB", 2),
    ...pickByPosition(sorted, "WR", 2),
    ...pickByPosition(sorted, "TE", 1),
    ...pickByPosition(sorted, "DST", 1),
    ...pickByPosition(sorted, "K", 1),
  ];

  const selected = new Set(starters.map((player) => player.id));
  const flex = sorted
    .filter(
      (player) =>
        !selected.has(player.id) && FLEX_POSITIONS.has(player.position),
    )
    .slice(0, Math.max(0, flexSpots));

  flex.forEach((player) => selected.add(player.id));

  const lineup = [...starters, ...flex].map((player) => ({
    ...player,
    lineupSlot: flex.some((flexPlayer) => flexPlayer.id === player.id)
      ? "FLEX"
      : player.position,
  }));

  const projectedTotal = Number(
    lineup
      .reduce((total, player) => total + toNumber(player.projection), 0)
      .toFixed(1),
  );

  return {
    starters: lineup,
    bench: sorted.filter((player) => !selected.has(player.id)),
    projectedTotal,
  };
}

export function buildHeadToHead(myLineup, opponentLineup) {
  const slots = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "DST", "K"];
  const myAvailable = [...myLineup.starters];
  const oppAvailable = [...opponentLineup.starters];

  const consume = (pool, slot) => {
    const index = pool.findIndex(
      (player) =>
        player.lineupSlot === slot ||
        (slot !== "FLEX" && player.position === slot),
    );
    if (index === -1) return null;
    const [player] = pool.splice(index, 1);
    return player;
  };

  const matchups = slots.map((slot) => {
    const mine = consume(myAvailable, slot);
    const theirs = consume(oppAvailable, slot);
    const myPoints = toNumber(mine?.projection);
    const oppPoints = toNumber(theirs?.projection);
    const edge = Number((myPoints - oppPoints).toFixed(1));

    return {
      slot,
      mine,
      theirs,
      edge,
      winner: edge > 0.25 ? "me" : edge < -0.25 ? "opponent" : "even",
    };
  });

  const totalEdge = Number(
    (myLineup.projectedTotal - opponentLineup.projectedTotal).toFixed(1),
  );
  const rawWin = 50 + totalEdge * 3.2;

  return {
    matchups,
    totalEdge,
    winProbability: Math.round(Math.max(5, Math.min(95, rawWin))),
  };
}
