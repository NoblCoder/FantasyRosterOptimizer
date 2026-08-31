/** @format */

const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

export function getEspnSetup() {
  return request("/espn/setup", { method: "GET" });
}

export function saveEspnSetup({ leagueId, teamId, season }) {
  return request("/espn/setup", {
    method: "POST",
    body: JSON.stringify({ leagueId, teamId, season }),
  });
}

export function runEspnPreflight() {
  return request("/espn/setup/preflight", { method: "POST" });
}

export function runEspnSync() {
  return request("/espn/setup/sync", { method: "POST" });
}

export function getLatestSyncedEspnRoster() {
  return request("/espn/setup/roster", { method: "GET" });
}
