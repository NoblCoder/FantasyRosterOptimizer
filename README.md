# Roster IQ

Roster IQ is a React Native and Express fantasy-football lineup optimizer. It stores rosters in PostgreSQL and ranks players using weekly projections, defensive matchup, weather, historical opponent performance, and usage trends.

## Backend

```bash
cd backend
cp .env.example .env
# Set DATABASE_URL and a strong REFRESH_API_KEY.
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

The API runs on `http://localhost:3000`. Its browser origins, database connection, and refresh credentials are configured through `backend/.env`.

### API

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Liveness and database readiness |
| `GET /api/players?query=` | Search rosterable players |
| `POST /api/players` | Create a player |
| `POST /api/rosters` | Create a roster with league settings |
| `GET /api/rosters/:rosterId` | Fetch a roster |
| `POST /api/rosters/:rosterId/players` | Add a player after a trade |
| `DELETE /api/rosters/:rosterId/players/:playerId` | Remove a traded-away player |
| `POST /api/rosters/:rosterId/optimize` | Return the recommended starters and bench |
| `POST /api/admin/refresh` | Refresh ESPN schedule data; requires `Authorization: Bearer <REFRESH_API_KEY>` |
| `POST /api/admin/espn-roster-sync` | Import the configured private ESPN team; requires `Authorization: Bearer <REFRESH_API_KEY>` |
| `POST /api/advice` | Get AI roster advice using the supplied question and roster context |

`POST /api/rosters/:rosterId/optimize` requires a JSON body containing `season` and `week`. The optimizer follows QB, 2 RB, 2 WR, TE, FLEX, D/ST, and K roster rules, using the roster's configured number of FLEX positions.

## Data ingestion

The refresh endpoint imports NFL schedule and venue metadata from ESPN's public NFL scoreboard endpoint. Production deployments should invoke it through a managed scheduler with a protected secret. Weekly projections, defensive-versus-position metrics, player usage, historical metrics, and weather forecasts are stored independently so each provider can be updated without changing the optimization API. Configure an OpenWeatherMap key before enabling weather ingestion.

### Private ESPN team sync

Add `ESPN_LEAGUE_ID`, `ESPN_TEAM_ID`, `ESPN_S2`, and `ESPN_SWID` to `backend/.env`. Retrieve the last two values from your logged-in ESPN browser session and keep them private; they must never be added to the mobile app configuration or committed to Git. Then invoke:

```bash
curl -X POST http://localhost:3000/api/admin/espn-roster-sync \
  -H "Authorization: Bearer $REFRESH_API_KEY"
```

The sync replaces the stored roster with the current ESPN starters and bench. Because ESPN does not provide an official fantasy API, this integration is read-only and may require maintenance when ESPN changes its internal endpoints.

### AI roster advice

Set `OPENAI_API_KEY` in `backend/.env` to enable the in-app Roster IQ Assistant. The key is used only by the Express API and is never exposed to the Expo app. Optionally set `OPENAI_MODEL` (defaults to `gpt-4.1-mini`). The app sends the player's question and its locally displayed roster to `POST /api/advice`.

The assistant also accepts an uploaded JPG, PNG, or WebP roster screenshot (up to 1 MB). It is sent only with the advice request so the configured AI model can evaluate the shown matchup details.

## Frontend

```bash
cd app
npm install
npm run web
```

### Run locally from VS Code

For personal use, opening this folder in VS Code is the simplest way to run the entire app without deployment. Install dependencies once:

```bash
cd backend && npm install
cd ../app && npm install
```

Copy `backend/.env.example` to `backend/.env` and set `OPENAI_API_KEY`. Then open **Terminal → Run Task → Launch Roster IQ** in VS Code. This starts the API at `http://localhost:3000` and Expo web at `http://localhost:8082`. Open the Expo URL in your browser.

## Deployment

The repository includes `render.yaml` for a Render Blueprint that provisions the API and PostgreSQL database. Before applying the Blueprint, enter an `OPENAI_API_KEY` when Render requests it.

GitHub Pages is deployed by `.github/workflows/deploy-pages.yml` whenever `main` changes. After Render has created the API, add an Actions variable named `EXPO_PUBLIC_API_URL` with the service URL plus `/api` (for example, `https://noblcoder-fantasy-roster-api.onrender.com/api`) in **Settings → Secrets and variables → Actions → Variables**, then re-run the Pages workflow.
