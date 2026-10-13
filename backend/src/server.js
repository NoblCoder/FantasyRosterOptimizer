/** @format */

require("dotenv").config();

const compression = require("compression");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { PrismaClient } = require("@prisma/client");
const config = require("./config");
const rostersRouter = require("./routes/rosters");
const adviceRouter = require("./routes/advice");
const { refreshEspnSchedule } = require("./services/espn");
const {
  fetchEspnLeagueSnapshot,
  getEffectiveEspnConfig,
  readLocalEspnConfig,
  syncEspnRoster,
  writeLocalEspnConfig,
} = require("./services/espnRoster");

const prisma = new PrismaClient();
const app = express();

function asPositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
  }),
);
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.get("/health", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.use("/api", rostersRouter);
app.use("/api", adviceRouter);

app.post("/api/admin/refresh", async (req, res, next) => {
  try {
    if (
      !config.refreshApiKey ||
      req.get("authorization") !== `Bearer ${config.refreshApiKey}`
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const season = Number(req.body.season);
    const week = Number(req.body.week);
    if (
      !Number.isInteger(season) ||
      !Number.isInteger(week) ||
      week < 1 ||
      week > 18
    ) {
      return res
        .status(400)
        .json({ error: "season and week (1-18) are required" });
    }
    const result = await refreshEspnSchedule(prisma, { season, week });
    return res
      .status(202)
      .json({ status: "accepted", provider: "ESPN", ...result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/espn-roster-sync", async (req, res, next) => {
  try {
    if (
      !config.refreshApiKey ||
      req.get("authorization") !== `Bearer ${config.refreshApiKey}`
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await syncEspnRoster(prisma, config);
    return res
      .status(200)
      .json({ status: "succeeded", provider: "ESPN", ...result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/espn-preflight", async (req, res, next) => {
  try {
    if (
      !config.refreshApiKey ||
      req.get("authorization") !== `Bearer ${config.refreshApiKey}`
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    let database = { ok: true };
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      database = { ok: false, message: error.message };
    }

    let leagueAccess = { ok: true };
    try {
      const effectiveConfig = await getEffectiveEspnConfig(config);
      const snapshot = await fetchEspnLeagueSnapshot(effectiveConfig);
      leagueAccess = { ok: true, ...snapshot };
    } catch (error) {
      leagueAccess = { ok: false, message: error.message };
    }

    const localConfig = await readLocalEspnConfig();
    const effectiveConfig = await getEffectiveEspnConfig(config);

    return res.json({
      provider: "ESPN",
      env: {
        espnLeagueId: Boolean(config.espnLeagueId),
        espnTeamId:
          Number.isInteger(config.espnTeamId) && config.espnTeamId > 0,
        espnS2: Boolean(config.espnS2),
        espnSwid: Boolean(config.espnSwid),
        espnSeason: config.espnSeason,
      },
      localConfig,
      effective: {
        espnLeagueId: effectiveConfig.espnLeagueId || null,
        espnTeamId: effectiveConfig.espnTeamId || null,
        espnSeason: effectiveConfig.espnSeason,
      },
      database,
      leagueAccess,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/espn/setup", async (req, res, next) => {
  try {
    if (config.isProduction) {
      return res.status(403).json({
        error: "This setup endpoint is only available in development.",
      });
    }

    const localConfig = await readLocalEspnConfig();
    const effectiveConfig = await getEffectiveEspnConfig(config);

    return res.json({
      leagueId: effectiveConfig.espnLeagueId || "",
      teamId: effectiveConfig.espnTeamId || "",
      season: effectiveConfig.espnSeason,
      hasSecrets: Boolean(effectiveConfig.espnS2 && effectiveConfig.espnSwid),
      source: {
        leagueId: localConfig.espnLeagueId
          ? "local-file"
          : config.espnLeagueId
            ? "env"
            : "unset",
        teamId: localConfig.espnTeamId
          ? "local-file"
          : config.espnTeamId
            ? "env"
            : "unset",
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/espn/setup", async (req, res, next) => {
  try {
    if (config.isProduction) {
      return res.status(403).json({
        error: "This setup endpoint is only available in development.",
      });
    }

    const leagueId = asPositiveInt(req.body.leagueId);
    const teamId = asPositiveInt(req.body.teamId);
    const season = asPositiveInt(req.body.season);

    if (!leagueId || !teamId) {
      return res.status(400).json({
        error: "leagueId and teamId must be positive integers.",
      });
    }

    const saved = await writeLocalEspnConfig({
      espnLeagueId: leagueId,
      espnTeamId: teamId,
      ...(season ? { espnSeason: season } : {}),
    });

    return res.status(200).json({
      saved: {
        leagueId: saved.espnLeagueId,
        teamId: saved.espnTeamId,
        season: saved.espnSeason,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/espn/setup/preflight", async (req, res, next) => {
  try {
    if (config.isProduction) {
      return res.status(403).json({
        error: "This setup endpoint is only available in development.",
      });
    }

    const effectiveConfig = await getEffectiveEspnConfig(config);
    let database = { ok: true };
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      database = { ok: false, message: error.message };
    }

    let leagueAccess = { ok: true };
    try {
      const snapshot = await fetchEspnLeagueSnapshot(effectiveConfig);
      const configuredTeamFound = snapshot.teams.some(
        (team) => team.id === effectiveConfig.espnTeamId,
      );
      leagueAccess = {
        ok: true,
        configuredTeamFound,
        ...snapshot,
      };
    } catch (error) {
      leagueAccess = { ok: false, message: error.message };
    }

    return res.json({
      env: {
        hasLeagueId: Boolean(effectiveConfig.espnLeagueId),
        hasTeamId: Number.isInteger(effectiveConfig.espnTeamId),
        hasSecrets: Boolean(effectiveConfig.espnS2 && effectiveConfig.espnSwid),
        season: effectiveConfig.espnSeason,
      },
      currentWeek: leagueAccess.ok ? leagueAccess.currentWeek : null,
      database,
      leagueAccess,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/espn/setup/sync", async (req, res, next) => {
  try {
    if (config.isProduction) {
      return res.status(403).json({
        error: "This setup endpoint is only available in development.",
      });
    }

    const result = await syncEspnRoster(prisma, config);
    return res.status(200).json({ status: "succeeded", ...result });
  } catch (error) {
    next(error);
  }
});

app.get("/api/espn/setup/roster", async (req, res, next) => {
  try {
    if (config.isProduction) {
      return res.status(403).json({
        error: "This setup endpoint is only available in development.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: "personal@rosteriq.local" },
    });
    if (!user) {
      return res
        .status(404)
        .json({ error: "No synced ESPN roster found yet." });
    }

    const roster = await prisma.roster.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        players: {
          include: { player: true },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!roster) {
      return res
        .status(404)
        .json({ error: "No synced ESPN roster found yet." });
    }

    const latestSync = await prisma.dataRefresh.findFirst({
      where: {
        provider: "ESPN",
        resource: "private-roster",
        status: "SUCCEEDED",
      },
      orderBy: { completedAt: "desc" },
    });
    const latestDetail =
      latestSync?.detail && typeof latestSync.detail === "object"
        ? latestSync.detail
        : {};
    const season = Number(latestDetail.season);
    const week = Number(latestDetail.week);

    const players = roster.players.map((slot) => ({
      id: `espn-${slot.player.espnId || slot.player.id}`,
      name: slot.player.name,
      team: slot.player.team || "",
      position: slot.player.position,
      status: slot.status,
      selected: slot.status === "STARTER",
    }));

    return res.json({
      roster: {
        id: roster.id,
        name: roster.name,
        updatedAt: roster.updatedAt,
        season: Number.isFinite(season) ? season : null,
        week: Number.isFinite(week) ? week : null,
        players,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((error, req, res, next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: status >= 500 ? "Internal server error" : error.message,
    ...(config.isProduction ? {} : { message: error.message }),
  });
});

if (config.enableInternalScheduler) {
  setInterval(
    () => {
      console.warn(
        "Internal refresh scheduling requires an external season/week trigger.",
      );
    },
    6 * 60 * 60 * 1000,
  ).unref();
}

if (require.main === module) {
  app.listen(config.port, () =>
    console.log(`Roster IQ API listening on port ${config.port}`),
  );
}

module.exports = app;
