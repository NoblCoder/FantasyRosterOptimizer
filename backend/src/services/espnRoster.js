const ESPN_LEAGUE_URL = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";

const POSITION_MAP = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DST",
};

const STARTER_SLOTS = new Set([0, 2, 4, 6, 16, 17, 23]);

function assertEspnConfig(config) {
  const missing = [
    ["ESPN_LEAGUE_ID", config.espnLeagueId],
    ["ESPN_TEAM_ID", config.espnTeamId],
    ["ESPN_S2", config.espnS2],
    ["ESPN_SWID", config.espnSwid],
  ].filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    const error = new Error(`ESPN sync is not configured: ${missing.join(", ")}`);
    error.status = 503;
    throw error;
  }
}

function mapRosterEntry(entry) {
  const player = entry.playerPoolEntry.player;
  const position = POSITION_MAP[player.defaultPositionId];
  if (!position) return null;
  return {
    espnId: String(player.id),
    name: player.fullName,
    position,
    team: player.proTeamId ? String(player.proTeamId) : null,
    status: STARTER_SLOTS.has(entry.lineupSlotId) ? "STARTER" : "BENCH",
  };
}

async function syncEspnRoster(prisma, config) {
  assertEspnConfig(config);
  const refresh = await prisma.dataRefresh.create({
    data: { provider: "ESPN", resource: "private-roster", status: "RUNNING" },
  });
  try {
    const url = `${ESPN_LEAGUE_URL}/${config.espnSeason}/segments/0/leagues/${config.espnLeagueId}?view=mRoster&view=mSettings`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Cookie: `espn_s2=${config.espnS2}; SWID=${config.espnSwid}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`ESPN roster request failed with ${response.status}`);

    const league = await response.json();
    const team = league.teams?.find((candidate) => candidate.id === config.espnTeamId);
    if (!team) {
      const error = new Error("ESPN team was not found in this league");
      error.status = 404;
      throw error;
    }
    const players = team.roster?.entries?.map(mapRosterEntry).filter(Boolean) || [];
    const user = await prisma.user.upsert({
      where: { email: "personal@rosteriq.local" },
      update: {},
      create: { email: "personal@rosteriq.local", name: "Personal Team" },
    });
    let roster = await prisma.roster.findFirst({
      where: { userId: user.id, name: league.name || "ESPN Team" },
    });
    if (!roster) {
      roster = await prisma.roster.create({
        data: { userId: user.id, name: league.name || "ESPN Team", scoringFormat: "PPR" },
      });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.rosterPlayer.deleteMany({ where: { rosterId: roster.id } });
      for (const player of players) {
        const storedPlayer = await transaction.player.upsert({
          where: { espnId: player.espnId },
          update: { name: player.name, team: player.team, position: player.position, active: true },
          create: player,
        });
        await transaction.rosterPlayer.create({
          data: { rosterId: roster.id, playerId: storedPlayer.id, status: player.status },
        });
      }
    });

    await prisma.dataRefresh.update({
      where: { id: refresh.id },
      data: { status: "SUCCEEDED", completedAt: new Date(), detail: { rosterId: roster.id, players: players.length } },
    });
    return { rosterId: roster.id, playersImported: players.length };
  } catch (error) {
    await prisma.dataRefresh.update({
      where: { id: refresh.id },
      data: { status: "FAILED", completedAt: new Date(), detail: { message: error.message } },
    });
    throw error;
  }
}

module.exports = { syncEspnRoster };
