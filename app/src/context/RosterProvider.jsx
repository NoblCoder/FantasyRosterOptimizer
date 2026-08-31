/** @format */

import { createContext, useContext, useEffect, useState } from "react";
import { rosterPlayers } from "../data/roster";
import { getLatestSyncedEspnRoster } from "../services/espnSetup";

const RosterContext = createContext(null);

const POSITION_BASE_PROJECTION = {
  QB: 16.5,
  RB: 11.2,
  WR: 11.6,
  TE: 8.5,
  DST: 7,
  K: 8,
};

function projectionFor(player) {
  const parsed = Number(player.projection);
  if (Number.isFinite(parsed)) return parsed;
  return POSITION_BASE_PROJECTION[player.position] || 8;
}

function normalizePlayer(player) {
  const projection = projectionFor(player);
  return {
    id: player.id,
    name: player.name,
    team: player.team || "",
    position: player.position,
    opponent: player.opponent || "TBD",
    projection,
    score: Number.isFinite(player.score) ? player.score : undefined,
    confidence: Number.isFinite(player.confidence)
      ? player.confidence
      : undefined,
    usage: player.usage || "Usage signal unavailable",
    weather: player.weather || "Weather signal unavailable",
    matchup: player.matchup || "No matchup note available",
  };
}

export function RosterProvider({ children }) {
  const [roster, setRoster] = useState(rosterPlayers.map(normalizePlayer));
  const [opponentRoster, setOpponentRoster] = useState([]);
  const [rosterSource, setRosterSource] = useState("sample");
  const [isHydratingRoster, setIsHydratingRoster] = useState(false);

  async function refreshRosterFromBackend() {
    setIsHydratingRoster(true);
    try {
      const response = await getLatestSyncedEspnRoster();
      const backendPlayers = Array.isArray(response.roster?.players)
        ? response.roster.players
        : [];
      if (backendPlayers.length) {
        setRoster(backendPlayers.map((player) => normalizePlayer(player)));
        setRosterSource("espn");
      }
      return backendPlayers.length;
    } catch {
      return 0;
    } finally {
      setIsHydratingRoster(false);
    }
  }

  useEffect(() => {
    refreshRosterFromBackend();
  }, []);

  function addPlayer(player, options = {}) {
    const target = options.target === "opponent" ? "opponent" : "me";
    const setTarget = target === "opponent" ? setOpponentRoster : setRoster;
    const normalized = normalizePlayer(player);

    setTarget((current) =>
      current.some((item) => item.id === normalized.id)
        ? current
        : [...current, normalized],
    );
  }

  function removePlayer(playerId, options = {}) {
    const target = options.target === "opponent" ? "opponent" : "me";
    const setTarget = target === "opponent" ? setOpponentRoster : setRoster;
    setTarget((current) => current.filter((player) => player.id !== playerId));
  }

  return (
    <RosterContext.Provider
      value={{
        addPlayer,
        removePlayer,
        roster,
        opponentRoster,
        rosterSource,
        isHydratingRoster,
        refreshRosterFromBackend,
      }}>
      {children}
    </RosterContext.Provider>
  );
}

export function useRoster() {
  const roster = useContext(RosterContext);
  if (!roster) throw new Error("useRoster must be used within RosterProvider");
  return roster;
}
