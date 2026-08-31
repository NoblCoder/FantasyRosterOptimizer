const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { optimizeLineup, scorePlayer } = require("../services/optimizer");

const prisma = new PrismaClient();
const router = express.Router();
const supportedFormats = new Set(["STANDARD", "HALF_PPR", "PPR"]);

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function enrichPlayer(player, season, week) {
  const projection = await prisma.weeklyProjection.findFirst({
    where: { playerId: player.id, season, week },
    orderBy: { retrievedAt: "desc" },
  });
  const matchup = await prisma.matchup.findFirst({
    where: { season, week, team: player.team || "", position: player.position },
    include: { stadium: { include: { weather: { where: { season, week } } } } },
  });
  const history = matchup
    ? await prisma.historicalPerformance.findUnique({
      where: { playerId_opponent: { playerId: player.id, opponent: matchup.opponent } },
    })
    : null;
  const usage = await prisma.playerUsage.findUnique({
    where: { playerId_season_week: { playerId: player.id, season, week } },
  });
  const weather = matchup?.stadium?.weather?.[0];

  return scorePlayer(player, { projection, matchup, weather, history, usage });
}

router.get("/players", async (req, res, next) => {
  try {
    const query = String(req.query.query || "").trim();
    const players = await prisma.player.findMany({
      where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
      take: 20,
    });
    res.json({ players });
  } catch (error) {
    next(error);
  }
});

router.post("/players", async (req, res, next) => {
  try {
    const { espnId, name, team, position } = req.body;
    if (!name || !position) throw requestError("name and position are required");
    const player = await prisma.player.create({
      data: { espnId: espnId ? String(espnId) : undefined, name, team, position },
    });
    res.status(201).json({ player });
  } catch (error) {
    next(error);
  }
});

router.post("/rosters", async (req, res, next) => {
  try {
    const { userId, name, scoringFormat = "PPR", flexSpots = 1, benchSize = 6, playerIds = [] } = req.body;
    if (!userId || !name) throw requestError("userId and name are required");
    if (!supportedFormats.has(scoringFormat)) throw requestError("scoringFormat must be STANDARD, HALF_PPR, or PPR");
    if (!Number.isInteger(flexSpots) || flexSpots < 0 || flexSpots > 5) throw requestError("flexSpots must be an integer between 0 and 5");
    if (!Array.isArray(playerIds) || new Set(playerIds).size !== playerIds.length) throw requestError("playerIds must be a unique array");

    const existingPlayers = await prisma.player.count({ where: { id: { in: playerIds } } });
    if (existingPlayers !== playerIds.length) throw requestError("One or more playerIds do not exist");
    const roster = await prisma.roster.create({
      data: {
        userId,
        name,
        scoringFormat,
        flexSpots,
        benchSize,
        players: { create: playerIds.map((playerId) => ({ playerId })) },
      },
      include: { players: { include: { player: true } } },
    });
    res.status(201).json({ roster });
  } catch (error) {
    next(error);
  }
});

router.get("/rosters/:rosterId", async (req, res, next) => {
  try {
    const roster = await prisma.roster.findUnique({
      where: { id: req.params.rosterId },
      include: { players: { include: { player: true } } },
    });
    if (!roster) throw requestError("Roster not found", 404);
    res.json({ roster });
  } catch (error) {
    next(error);
  }
});

router.post("/rosters/:rosterId/players", async (req, res, next) => {
  try {
    const { playerId, status = "BENCH" } = req.body;
    if (!playerId) throw requestError("playerId is required");
    const roster = await prisma.roster.findUnique({ where: { id: req.params.rosterId } });
    if (!roster) throw requestError("Roster not found", 404);
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw requestError("Player not found", 404);
    const rosterPlayer = await prisma.rosterPlayer.create({
      data: { rosterId: roster.id, playerId, status },
      include: { player: true },
    });
    res.status(201).json({ rosterPlayer });
  } catch (error) {
    if (error.code === "P2002") return next(requestError("Player is already on this roster", 409));
    next(error);
  }
});

router.delete("/rosters/:rosterId/players/:playerId", async (req, res, next) => {
  try {
    const rosterPlayer = await prisma.rosterPlayer.deleteMany({
      where: { rosterId: req.params.rosterId, playerId: req.params.playerId },
    });
    if (!rosterPlayer.count) throw requestError("Player is not on this roster", 404);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/rosters/:rosterId/optimize", async (req, res, next) => {
  try {
    const season = Number(req.body.season);
    const week = Number(req.body.week);
    if (!Number.isInteger(season) || !Number.isInteger(week) || week < 1 || week > 18) {
      throw requestError("season and week (1-18) are required");
    }
    const roster = await prisma.roster.findUnique({
      where: { id: req.params.rosterId },
      include: { players: { include: { player: true } } },
    });
    if (!roster) throw requestError("Roster not found", 404);
    const scoredPlayers = await Promise.all(
      roster.players.map(({ player }) => enrichPlayer(player, season, week)),
    );
    const lineup = optimizeLineup(scoredPlayers, roster.flexSpots);
    res.json({ rosterId: roster.id, season, week, scoringFormat: roster.scoringFormat, ...lineup });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
