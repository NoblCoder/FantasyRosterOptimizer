/** @format */

const fs = require("node:fs/promises");
const path = require("node:path");

const ESPN_LEAGUE_URL =
  "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";
const ESPN_LOCAL_CONFIG_PATH = path.resolve(
  __dirname,
  "../../.espn-config.json",
);

const POSITION_MAP = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DST",
};

const STARTER_SLOTS = new Set([0, 2, 4, 6, 16, 17, 23]);

function extractCurrentWeek(league) {
  const candidates = [
    league?.scoringPeriodId,
    league?.status?.currentScoringPeriod,
    league?.status?.currentMatchupPeriod,
    league?.status?.latestScoringPeriod,
    league?.segmentMetadata?.scoringPeriodId,
  ];
  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function toOptionalPositiveInt(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

async function readLocalEspnConfig() {
  try {
    const raw = await fs.readFile(ESPN_LOCAL_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      espnLeagueId: toOptionalPositiveInt(parsed.espnLeagueId),
      espnTeamId: toOptionalPositiveInt(parsed.espnTeamId),
      espnSeason: toOptionalPositiveInt(parsed.espnSeason),
    };
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writeLocalEspnConfig(nextConfig) {
  const current = await readLocalEspnConfig();
  const merged = {
    ...current,
    ...nextConfig,
  };

  await fs.writeFile(
    ESPN_LOCAL_CONFIG_PATH,
    `${JSON.stringify(merged, null, 2)}\n`,
    "utf8",
  );

  return merged;
}

async function getEffectiveEspnConfig(baseConfig) {
  const local = await readLocalEspnConfig();
  return {
    ...baseConfig,
    espnLeagueId: local.espnLeagueId || baseConfig.espnLeagueId,
    espnTeamId: local.espnTeamId || baseConfig.espnTeamId,
    espnSeason: local.espnSeason || baseConfig.espnSeason,
  };
}

function assertEspnConfig(config) {
  const missing = [
    ["ESPN_LEAGUE_ID", config.espnLeagueId],
    ["ESPN_TEAM_ID", config.espnTeamId],
    ["ESPN_S2", config.espnS2],
    ["ESPN_SWID", config.espnSwid],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    const error = new Error(
      `ESPN sync is not configured: ${missing.join(", ")}`,
    );
    error.status = 503;
    throw error;
  }
}

function assertEspnLeagueAccessConfig(config) {
  const missing = [
    ["ESPN_LEAGUE_ID", config.espnLeagueId],
    ["ESPN_S2", config.espnS2],
    ["ESPN_SWID", config.espnSwid],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length) {
    const error = new Error(
      `ESPN league access is not configured: ${missing.join(", ")}`,
    );
    error.status = 503;
    throw error;
  }
}

async function fetchEspnLeagueSnapshot(config) {
  assertEspnLeagueAccessConfig(config);
  const url = `${ESPN_LEAGUE_URL}/${config.espnSeason}/segments/0/leagues/${config.espnLeagueId}?view=mRoster&view=mSettings`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Cookie: `espn_s2=${config.espnS2}; SWID=${config.espnSwid}`,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const error = new Error(
      `ESPN league request failed with ${response.status}`,
    );
    error.status = 502;
    throw error;
  }

  const league = await response.json();
  const teams = Array.isArray(league.teams) ? league.teams : [];
  const members = Array.isArray(league.members) ? league.members : [];
  const memberById = new Map(
    members
      .filter((member) => member && member.id)
      .map((member) => [member.id, member]),
  );

  const summarizedTeams = teams.map((team) => {
    const primaryOwnerId = team.primaryOwner;
    const owner = memberById.get(primaryOwnerId);
    const ownerName = owner
      ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim() ||
        owner.displayName ||
        "Unknown"
      : "Unknown";
    const teamName =
      [team.location, team.nickname].filter(Boolean).join(" ") ||
      team.name ||
      `Team ${team.id}`;

    return {
      id: team.id,
      name: teamName,
      abbrev: team.abbrev || null,
      owner: ownerName,
      rosterSize: Array.isArray(team.roster?.entries)
        ? team.roster.entries.length
        : 0,
    };
  });

  return {
    leagueName: league.settings?.name || league.name || "ESPN League",
    season: league.seasonId || config.espnSeason,
    currentWeek: extractCurrentWeek(league),
    teamCount: summarizedTeams.length,
    teams: summarizedTeams,
  };
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
  const effectiveConfig = await getEffectiveEspnConfig(config);
  assertEspnConfig(effectiveConfig);
  const refresh = await prisma.dataRefresh.create({
    data: { provider: "ESPN", resource: "private-roster", status: "RUNNING" },
  });
  try {
    const url = `${ESPN_LEAGUE_URL}/${effectiveConfig.espnSeason}/segments/0/leagues/${effectiveConfig.espnLeagueId}?view=mRoster&view=mSettings`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Cookie: `espn_s2=${effectiveConfig.espnS2}; SWID=${effectiveConfig.espnSwid}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new Error(`ESPN roster request failed with ${response.status}`);

    const league = await response.json();
    const currentWeek = extractCurrentWeek(league);
    const season = Number(league.seasonId) || effectiveConfig.espnSeason;
    const team = league.teams?.find(
      (candidate) => candidate.id === effectiveConfig.espnTeamId,
    );
    if (!team) {
      const error = new Error("ESPN team was not found in this league");
      error.status = 404;
      throw error;
    }
    const players =
      team.roster?.entries?.map(mapRosterEntry).filter(Boolean) || [];
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
        data: {
          userId: user.id,
          name: league.name || "ESPN Team",
          scoringFormat: "PPR",
        },
      });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.rosterPlayer.deleteMany({
        where: { rosterId: roster.id },
      });
      for (const player of players) {
        const storedPlayer = await transaction.player.upsert({
          where: { espnId: player.espnId },
          update: {
            name: player.name,
            team: player.team,
            position: player.position,
            active: true,
          },
          create: {
            espnId: player.espnId,
            name: player.name,
            team: player.team,
            position: player.position,
            active: true,
          },
        });
        await transaction.rosterPlayer.create({
          data: {
            rosterId: roster.id,
            playerId: storedPlayer.id,
            status: player.status,
          },
        });
      }
    });

    await prisma.dataRefresh.update({
      where: { id: refresh.id },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        detail: {
          rosterId: roster.id,
          players: players.length,
          season,
          week: currentWeek,
        },
      },
    });
    return {
      rosterId: roster.id,
      playersImported: players.length,
      season,
      week: currentWeek,
    };
  } catch (error) {
    await prisma.dataRefresh.update({
      where: { id: refresh.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        detail: { message: error.message },
      },
    });
    throw error;
  }
}

module.exports = {
  syncEspnRoster,
  fetchEspnLeagueSnapshot,
  getEffectiveEspnConfig,
  readLocalEspnConfig,
  writeLocalEspnConfig,
};
