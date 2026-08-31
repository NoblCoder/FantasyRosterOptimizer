const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`ESPN request failed with ${response.status}`);
  return response.json();
}

async function refreshEspnSchedule(prisma, { season, week }) {
  const refresh = await prisma.dataRefresh.create({
    data: { provider: "ESPN", resource: "schedule", status: "RUNNING" },
  });

  try {
    const payload = await fetchJson(`${ESPN_SCOREBOARD_URL}?limit=100&dates=${season}`);
    const events = payload.events || [];
    await prisma.$transaction(events.flatMap((event) => {
      const competition = event.competitions?.[0];
      const venue = competition?.venue;
      if (!venue?.id) return [];
      const home = competition.competitors?.find((team) => team.homeAway === "home")?.team?.abbreviation;
      const away = competition.competitors?.find((team) => team.homeAway === "away")?.team?.abbreviation;
      if (!home || !away) return [];
      return [
        prisma.stadium.upsert({
          where: { espnVenueId: String(venue.id) },
          update: { name: venue.fullName, city: venue.address?.city, state: venue.address?.state },
          create: { espnVenueId: String(venue.id), name: venue.fullName, city: venue.address?.city, state: venue.address?.state },
        }),
      ];
    }));
    await prisma.dataRefresh.update({
      where: { id: refresh.id },
      data: { status: "SUCCEEDED", completedAt: new Date(), detail: { season, week, events: events.length } },
    });
    return { events: events.length };
  } catch (error) {
    await prisma.dataRefresh.update({
      where: { id: refresh.id },
      data: { status: "FAILED", completedAt: new Date(), detail: { message: error.message } },
    });
    throw error;
  }
}

module.exports = { refreshEspnSchedule };
