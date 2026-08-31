/** @format */

const express = require("express");
const rateLimit = require("express-rate-limit");
const config = require("../config");

const router = express.Router();

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
    .filter((player) => Number.isFinite(player.projection))
    .sort((left, right) => {
      if (right.projection !== left.projection)
        return right.projection - left.projection;
      return slotOrder(left.position) - slotOrder(right.position);
    });
}

function summarizeTopPlayer(player) {
  if (!player) return "No clear top option yet";
  const projection = Number.isFinite(player.projection)
    ? player.projection.toFixed(1)
    : "--";
  return `${player.name} (${player.position}, ${projection} pts${player.opponent ? `, ${player.opponent}` : ""})`;
}

function buildFallbackAdvice(question, rosterContext, opponentContext) {
  const myTop = topProjectionPlayers(rosterContext).slice(0, 9);
  const oppTop = topProjectionPlayers(opponentContext).slice(0, 9);
  const myTotal = myTop.reduce(
    (sum, player) => sum + (player.projection || 0),
    0,
  );
  const oppTotal = oppTop.reduce(
    (sum, player) => sum + (player.projection || 0),
    0,
  );
  const edge = myTotal - oppTotal;
  const bestStart = myTop[0];
  const bestBench = topProjectionPlayers(rosterContext).slice(9, 20)[0];
  const matchupNote =
    bestStart?.matchup || "No matchup data loaded for top starter yet";
  const questionLead = question
    ? `On your question (${question.slice(0, 100)}), `
    : "Based on your current lineup, ";

  return `${questionLead}your projected core is ${myTotal.toFixed(1)} points${oppTop.length ? ` versus ${oppTotal.toFixed(1)} for your opponent (${edge >= 0 ? "+" : ""}${edge.toFixed(1)} edge)` : ""}. Prioritize ${summarizeTopPlayer(bestStart)} as a lineup anchor. ${bestBench ? `Your top bench pivot is ${summarizeTopPlayer(bestBench)} if late news changes usage.` : "Add 1-2 more depth players so I can suggest stronger pivots."} Matchup angle: ${matchupNote}. If you share any uncertain start/sit slot, I can give a direct recommendation.`;
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
      return res
        .status(400)
        .json({
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
          "You are Roster IQ, a concise fantasy-football assistant. Give practical, probabilistic advice based only on the roster context supplied. State uncertainty, never invent current news or statistics, and ask one focused follow-up only when necessary. Keep answers below 180 words.",
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
