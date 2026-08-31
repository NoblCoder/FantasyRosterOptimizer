import { createContext, useContext, useState } from "react";
import { rosterPlayers } from "../data/roster";

const RosterContext = createContext(null);

export function RosterProvider({ children }) {
  const [roster, setRoster] = useState(rosterPlayers);

  function addPlayer(player) {
    setRoster((current) =>
      current.some((item) => item.id === player.id) ? current : [...current, player],
    );
  }

  function removePlayer(playerId) {
    setRoster((current) => current.filter((player) => player.id !== playerId));
  }

  return (
    <RosterContext.Provider value={{ addPlayer, removePlayer, roster }}>
      {children}
    </RosterContext.Provider>
  );
}

export function useRoster() {
  const roster = useContext(RosterContext);
  if (!roster) throw new Error("useRoster must be used within RosterProvider");
  return roster;
}
