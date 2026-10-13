/** @format */

const express = require("express");
const rateLimit = require("express-rate-limit");
const config = require("../config");

const router = express.Router();
const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);
const SLOT_ORDER = ["QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX", "DST", "K"];

function sanitizeRoster(rawRoster) {
  const roster = Array.isArray(rawRoster) ? rawRoster.slice(0, 40) : [];
  return roster
    .filter((player) => player && typeof player.name === "string")
    .map((player) => ({
      name: player.name.slice(0, 100),
      position: String(player.position || "").slice(0, 10),
      team: String(player.team || "").slice(0, 10),
      opponent: String(player.opponent || "").slice(0, 20),
      projection: Number.isFinite(player.projection) ? player.projection : null,
      score: Number.isFinite(player.score) ? player.score : null,
      selected: Boolean(player.selected),
      matchup: String(player.matchup || "").slice(0, 200),
    }));
}

function projectionFor(player) {
  if (Number.isFinite(player.projection)) return player.projection;
  if (player.position === "QB") return 16;
  if (player.position === "RB") return 10.5;
  if (player.position === "WR") return 10.8;
  if (player.position === "TE") return 8;
  if (player.position === "DST") return 7;
  if (player.position === "K") return 8;
  return 8;
}

function slotOrder(position) {
  if (position === "QB") return 1;
  if (position === "RB") return 2;
  if (position === "WR") return 3;
  if (position === "TE") return 4;
  if (position === "DST") return 5;
  if (position === "K") return 6;
  return 9;
}

function topProjectionPlayers(rosterContext) {
  return rosterContext
    .map((player) => ({ ...player, projection: projectionFor(player) }))
    .sort((left, right) => {
      if (right.projection !== left.projection)
        return right.projection - left.projection;
      return slotOrder(left.position) - slotOrder(right.position);
    });
}

function buildLineup(rosterContext) {
  const ranked = topProjectionPlayers(rosterContext);
  const take = (predicate, count) => {
    const taken = [];
    for (const player of ranked) {
      if (taken.length >= count) break;
      if (predicate(player) && !taken.some((p) => p.id === player.id)) {
        taken.push(player);
      }
    }
    return taken;
  };

  const qb = take((p) => p.position === "QB", 1).map((p) => ({
    ...p,
    lineupSlot: "QB",
  }));
  const rb = take((p) => p.position === "RB", 2).map((p, i) => ({
    ...p,
    lineupSlot: i === 0 ? "RB1" : "RB2",
  }));
  const wr = take((p) => p.position === "WR", 2).map((p, i) => ({
    ...p,
    lineupSlot: i === 0 ? "WR1" : "WR2",
  }));
  const te = take((p) => p.position === "TE", 1).map((p) => ({
    ...p,
    lineupSlot: "TE",
  }));
  const dst = take((p) => p.position === "DST", 1).map((p) => ({
    ...p,
    lineupSlot: "DST",
  }));
  const k = take((p) => p.position === "K", 1).map((p) => ({
    ...p,
    lineupSlot: "K",
  }));

  const selectedIds = new Set(
    [...qb, ...rb, ...wr, ...te, ...dst, ...k].map((p) => p.id),
  );
  const flex = ranked
    .filter((p) => !selectedIds.has(p.id) && FLEX_POSITIONS.has(p.position))
    .slice(0, 1)
    .map((p) => ({ ...p, lineupSlot: "FLEX" }));

  const starters = [...qb, ...rb, ...wr, ...te, ...flex, ...dst, ...k].sort(
    (a, b) =>
      SLOT_ORDER.indexOf(a.lineupSlot) - SLOT_ORDER.indexOf(b.lineupSlot),
  );
  const selected = new Set(starters.map((p) => p.id));
  const bench = ranked.filter((p) => !selected.has(p.id));
  const projectedTotal = starters.reduce((sum, p) => sum + p.projection, 0);

  return { starters, bench, projectedTotal: Number(projectedTotal.toFixed(1)) };
}

function findBestSwap(lineup) {
  let best = null;
  for (const starter of lineup.starters) {
    for (const bench of lineup.bench) {
      const eligible =
        starter.position === bench.position ||
        (starter.lineupSlot === "FLEX" && FLEX_POSITIONS.has(bench.position));
      if (!eligible) continue;
      const gain = Number((bench.projection - starter.projection).toFixed(1));
      if (gain <= 0) continue;
      if (!best || gain > best.gain) {
        best = { starter, bench, gain };
      }
    }
  }
  return best;
}

function findQuestionComparison(question, rosterContext) {
  if (!question) return null;
  const lowered = question.toLowerCase();
  const mentioned = topProjectionPlayers(rosterContext).filter((player) =>
    lowered.includes(player.name.toLowerCase()),
  );
  if (mentioned.length < 2) return null;
  const [best, next] = mentioned.slice(0, 2);
  const edge = Number((best.projection - next.projection).toFixed(1));
  return { best, next, edge };
}

function summarizeTopPlayer(player) {
  if (!player) return "No clear top option yet";
  const projection = Number.isFinite(player.projection)
    ? player.projection.toFixed(1)
    : "--";
  return `${player.name} (${player.position}, ${projection} pts${player.opponent ? `, ${player.opponent}` : ""})`;
}

function buildFallbackAdvice(question, rosterContext, opponentContext) {
  const myLineup = buildLineup(rosterContext);
  const oppLineup = buildLineup(opponentContext);
  const totalEdge = Number(
    (myLineup.projectedTotal - oppLineup.projectedTotal).toFixed(1),
  );
  const swap = findBestSwap(myLineup);
  const comparison = findQuestionComparison(question, rosterContext);
  const strongestStarter = myLineup.starters[0];
  const matchupNote = strongestStarter?.matchup || "No matchup note available";

  if (!myLineup.starters.length) {
    return "I do not have enough player data yet. Add at least one QB, two RBs, two WRs, one TE, one DST, and one K for actionable start/sit advice.";
  }

  const lines = [];
  lines.push(
    `Projected starter total: ${myLineup.projectedTotal.toFixed(1)}${oppLineup.starters.length ? ` vs opponent ${oppLineup.projectedTotal.toFixed(1)} (${totalEdge >= 0 ? "+" : ""}${totalEdge})` : ""}.`,
  );

  if (comparison) {
    lines.push(
      `Direct call: start ${comparison.best.name} over ${comparison.next.name} (${comparison.edge >= 0 ? "+" : ""}${comparison.edge.toFixed(1)} pts).`,
    );
  } else if (swap) {
    lines.push(
      `Best upgrade: start ${swap.bench.name} over ${swap.starter.name} in ${swap.starter.lineupSlot} (${swap.gain >= 0 ? "+" : ""}${swap.gain.toFixed(1)} pts).`,
    );
  } else {
    const anchor = myLineup.starters[0];
    lines.push(
      `Direct call: keep ${anchor?.name || "your current starter core"} in your lineup; no bench option projects higher right now.`,
    );
  }

  const secondBench = myLineup.bench[0];
  if (secondBench) {
    lines.push(
      `Top bench contingency: ${summarizeTopPlayer(secondBench)} if late injury/weather news breaks.`,
    );
  } else {
    lines.push(
      "Top bench contingency: add one extra FLEX-depth player so you have a late-swap option before kickoff.",
    );
  }

  lines.push(`Matchup focus: ${matchupNote}.`);
  return lines.join(" ");
}

router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: "Advice request limit reached. Please try again shortly.",
    },
  }),
);

router.post("/advice", async (req, res, next) => {
  try {
    const message =
      typeof req.body.message === "string" ? req.body.message.trim() : "";
    const imageDataUrl =
      typeof req.body.imageDataUrl === "string" ? req.body.imageDataUrl : "";
    const rosterContext = sanitizeRoster(req.body.roster);
    const opponentContext = sanitizeRoster(req.body.opponentRoster);
    if ((!message && !imageDataUrl) || message.length > 1_000) {
      return res.status(400).json({
        error:
          "A question or roster image is required. Questions must be under 1,000 characters.",
      });
    }
    if (
      imageDataUrl &&
      (!/^data:image\/(jpeg|png|webp);base64,/.test(imageDataUrl) ||
        imageDataUrl.length > 1_500_000)
    ) {
      return res
        .status(400)
        .json({ error: "Upload a JPG, PNG, or WebP image smaller than 1 MB." });
    }

    if (!config.openAiApiKey) {
      return res.json({
        answer: buildFallbackAdvice(message, rosterContext, opponentContext),
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.openAiModel,
        instructions:
          "You are Roster IQ, a decisive fantasy-football assistant. Based only on supplied roster context, return concrete recommendations with player names and projected point deltas. Output exactly 4 short sentences: (1) projected total and opponent edge, (2) one direct start/sit call, (3) one bench contingency pivot, (4) one matchup note. Never say 'it depends' without still making a best call. Never invent live news or statistics. Keep answer under 140 words.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `My roster context:\n${JSON.stringify(rosterContext)}\n\nOpponent roster context:\n${JSON.stringify(opponentContext)}\n\nManager question:\n${message || "Analyze this roster screenshot for matchup-driven lineup moves."}`,
              },
              ...(imageDataUrl
                ? [
                    {
                      type: "input_image",
                      image_url: imageDataUrl,
                      detail: "low",
                    },
                  ]
                : []),
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("OpenAI advice request failed:", response.status, detail);
      return res.json({
        answer: buildFallbackAdvice(message, rosterContext, opponentContext),
      });
    }

    const result = await response.json();
    const answer = result.output_text?.trim();
    if (!answer) {
      return res.json({
        answer: buildFallbackAdvice(message, rosterContext, opponentContext),
      });
    }

    return res.json({ answer });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
