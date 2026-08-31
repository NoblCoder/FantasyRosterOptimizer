const express = require("express");
const rateLimit = require("express-rate-limit");
const config = require("../config");

const router = express.Router();

router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Advice request limit reached. Please try again shortly." },
}));

router.post("/advice", async (req, res, next) => {
  try {
    if (!config.openAiApiKey) {
      return res.status(503).json({ error: "AI advice is not configured on the server." });
    }

    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    const imageDataUrl = typeof req.body.imageDataUrl === "string" ? req.body.imageDataUrl : "";
    const roster = Array.isArray(req.body.roster) ? req.body.roster.slice(0, 40) : [];
    if ((!message && !imageDataUrl) || message.length > 1_000) {
      return res.status(400).json({ error: "A question or roster image is required. Questions must be under 1,000 characters." });
    }
    if (imageDataUrl && (!/^data:image\/(jpeg|png|webp);base64,/.test(imageDataUrl) || imageDataUrl.length > 1_500_000)) {
      return res.status(400).json({ error: "Upload a JPG, PNG, or WebP image smaller than 1 MB." });
    }

    const rosterContext = roster
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

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.openAiModel,
        instructions: "You are Roster IQ, a concise fantasy-football assistant. Give practical, probabilistic advice based only on the roster context supplied. State uncertainty, never invent current news or statistics, and ask one focused follow-up only when necessary. Keep answers below 180 words.",
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Roster context:\n${JSON.stringify(rosterContext)}\n\nManager question:\n${message || "Analyze this roster screenshot for matchup-driven lineup moves."}`,
            },
            ...(imageDataUrl ? [{ type: "input_image", image_url: imageDataUrl, detail: "low" }] : []),
          ],
        }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("OpenAI advice request failed:", response.status, detail);
      return res.status(502).json({ error: "The AI advice service could not answer right now." });
    }

    const result = await response.json();
    const answer = result.output_text?.trim();
    if (!answer) {
      return res.status(502).json({ error: "The AI advice service returned an empty response." });
    }

    return res.json({ answer });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
