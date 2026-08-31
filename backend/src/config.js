const requiredInProduction = ["DATABASE_URL", "REFRESH_API_KEY"];

function config() {
  const missing = requiredInProduction.filter(
    (key) => process.env.NODE_ENV === "production" && !process.env[key],
  );
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:8081")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    isProduction: process.env.NODE_ENV === "production",
    openWeatherApiKey: process.env.OPENWEATHER_API_KEY,
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    port: Number(process.env.PORT || 3000),
    refreshApiKey: process.env.REFRESH_API_KEY,
    enableInternalScheduler: process.env.ENABLE_INTERNAL_SCHEDULER === "true",
    espnLeagueId: process.env.ESPN_LEAGUE_ID,
    espnSeason: Number(process.env.ESPN_SEASON || new Date().getFullYear()),
    espnS2: process.env.ESPN_S2,
    espnSwid: process.env.ESPN_SWID,
    espnTeamId: Number(process.env.ESPN_TEAM_ID),
  };
}

module.exports = config();
