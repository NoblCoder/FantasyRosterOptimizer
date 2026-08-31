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
const { syncEspnRoster } = require("./services/espnRoster");

const prisma = new PrismaClient();
const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
}));
app.use(compression());
app.use(express.json({ limit: "100kb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));

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
    if (!config.refreshApiKey || req.get("authorization") !== `Bearer ${config.refreshApiKey}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const season = Number(req.body.season);
    const week = Number(req.body.week);
    if (!Number.isInteger(season) || !Number.isInteger(week) || week < 1 || week > 18) {
      return res.status(400).json({ error: "season and week (1-18) are required" });
    }
    const result = await refreshEspnSchedule(prisma, { season, week });
    return res.status(202).json({ status: "accepted", provider: "ESPN", ...result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/espn-roster-sync", async (req, res, next) => {
  try {
    if (!config.refreshApiKey || req.get("authorization") !== `Bearer ${config.refreshApiKey}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await syncEspnRoster(prisma, config);
    return res.status(200).json({ status: "succeeded", provider: "ESPN", ...result });
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
  setInterval(() => {
    console.warn("Internal refresh scheduling requires an external season/week trigger.");
  }, 6 * 60 * 60 * 1000).unref();
}

if (require.main === module) {
  app.listen(config.port, () => console.log(`Roster IQ API listening on port ${config.port}`));
}

module.exports = app;
