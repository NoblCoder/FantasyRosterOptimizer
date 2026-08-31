/** @format */

import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScalePressable, ScreenEntrance } from "../src/components/AnimatedUI";
import { useRoster } from "../src/context/RosterProvider";
import {
  getEspnSetup,
  runEspnPreflight,
  runEspnSync,
  saveEspnSetup,
} from "../src/services/espnSetup";

function formatStatus(result) {
  if (!result) return "Run preflight to test ESPN and database connectivity.";
  const db = result.database?.ok
    ? "Database: connected"
    : `Database: not ready (${result.database?.message || "unknown error"})`;
  const league = result.leagueAccess?.ok
    ? `League: connected (${result.leagueAccess.teamCount} teams found)`
    : `League: not ready (${result.leagueAccess?.message || "unknown error"})`;
  const team = result.leagueAccess?.ok
    ? result.leagueAccess.configuredTeamFound
      ? "Configured team: found"
      : "Configured team: not found in this league"
    : "Configured team: unknown";
  return `${db}\n${league}\n${team}`;
}

export default function EspnSetup() {
  const { refreshRosterFromBackend } = useRoster();
  const [leagueId, setLeagueId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSetup();
  }, []);

  async function loadSetup() {
    setIsLoading(true);
    setMessage("");
    try {
      const setup = await getEspnSetup();
      setLeagueId(setup.leagueId ? String(setup.leagueId) : "");
      setTeamId(setup.teamId ? String(setup.teamId) : "");
      setSeason(
        setup.season ? String(setup.season) : String(new Date().getFullYear()),
      );
      setMessage(
        setup.hasSecrets
          ? "Server has ESPN private cookies configured."
          : "Server is missing ESPN_S2 and/or ESPN_SWID in backend .env.",
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSetup() {
    setIsSaving(true);
    setMessage("");
    try {
      await saveEspnSetup({
        leagueId: Number(leagueId),
        teamId: Number(teamId),
        season: Number(season),
      });
      setMessage("Saved league and team configuration.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function runPreflightCheck() {
    setIsTesting(true);
    setMessage("");
    try {
      const result = await runEspnPreflight();
      setStatus(result);
      setMessage("Preflight completed.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsTesting(false);
    }
  }

  async function syncNow() {
    setIsSyncing(true);
    setMessage("");
    try {
      const result = await runEspnSync();
      await refreshRosterFromBackend();
      setMessage(
        `Sync complete: imported ${result.playersImported || 0} players.`,
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style='light' />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenEntrance style={styles.container}>
          <ScalePressable
            onPress={() => router.replace("/")}
            style={styles.backButton}>
            <Text style={styles.back}>‹ Dashboard</Text>
          </ScalePressable>

          <Text style={styles.eyebrow}>ESPN CONNECTION</Text>
          <Text style={styles.title}>Setup your ESPN league</Text>
          <Text style={styles.subtitle}>
            Enter League ID and Team ID. Keep ESPN_S2 and ESPN_SWID in backend
            env only.
          </Text>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color='#2DE2E6' />
              <Text style={styles.loadingText}>Loading ESPN setup...</Text>
            </View>
          ) : (
            <>
              <TextInput
                value={leagueId}
                onChangeText={setLeagueId}
                keyboardType='number-pad'
                placeholder='League ID'
                placeholderTextColor='#8D7AB8'
                style={styles.input}
              />
              <TextInput
                value={teamId}
                onChangeText={setTeamId}
                keyboardType='number-pad'
                placeholder='Team ID'
                placeholderTextColor='#8D7AB8'
                style={styles.input}
              />
              <TextInput
                value={season}
                onChangeText={setSeason}
                keyboardType='number-pad'
                placeholder='Season (e.g. 2026)'
                placeholderTextColor='#8D7AB8'
                style={styles.input}
              />

              <ScalePressable
                onPress={saveSetup}
                disabled={isSaving}
                style={[styles.primaryButton, isSaving && styles.disabled]}>
                <Text style={styles.primaryButtonText}>
                  {isSaving ? "Saving..." : "Save setup"}
                </Text>
              </ScalePressable>

              <ScalePressable
                onPress={runPreflightCheck}
                disabled={isTesting}
                style={[styles.secondaryButton, isTesting && styles.disabled]}>
                <Text style={styles.secondaryButtonText}>
                  {isTesting ? "Checking..." : "Run preflight"}
                </Text>
              </ScalePressable>

              <ScalePressable
                onPress={syncNow}
                disabled={isSyncing}
                style={[styles.syncButton, isSyncing && styles.disabled]}>
                <Text style={styles.syncButtonText}>
                  {isSyncing ? "Syncing..." : "Sync roster from ESPN"}
                </Text>
              </ScalePressable>

              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>Status</Text>
                <Text style={styles.statusText}>{formatStatus(status)}</Text>
                {message ? (
                  <Text style={styles.messageText}>{message}</Text>
                ) : null}
              </View>

              {status?.leagueAccess?.ok &&
              Array.isArray(status.leagueAccess.teams) ? (
                <View style={styles.teamList}>
                  <Text style={styles.teamTitle}>League teams</Text>
                  {status.leagueAccess.teams.map((team) => (
                    <Text key={team.id} style={styles.teamRow}>
                      {team.id} · {team.name} ({team.owner})
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScreenEntrance>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#10072C" },
  scroll: { paddingBottom: 30 },
  container: { padding: 20 },
  backButton: { alignSelf: "flex-start" },
  back: {
    color: "#2DE2E6",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 4,
  },
  eyebrow: {
    color: "#2DE2E6",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginTop: 18,
  },
  title: { color: "#FFF", fontSize: 30, fontWeight: "800", marginTop: 7 },
  subtitle: { color: "#C7B9EE", fontSize: 13, lineHeight: 19, marginTop: 7 },
  loadingWrap: { alignItems: "center", gap: 9, marginTop: 32 },
  loadingText: { color: "#C7B9EE", fontSize: 12 },
  input: {
    backgroundColor: "#21104C",
    borderColor: "#8B5CFF",
    borderRadius: 12,
    borderWidth: 2,
    color: "#FFF",
    fontSize: 15,
    marginTop: 12,
    padding: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2DE2E6",
    borderRadius: 12,
    marginTop: 16,
    padding: 14,
  },
  primaryButtonText: { color: "#140633", fontSize: 14, fontWeight: "800" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#3A1A78",
    borderColor: "#7A58C0",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  secondaryButtonText: { color: "#F4EDFF", fontSize: 14, fontWeight: "700" },
  syncButton: {
    alignItems: "center",
    backgroundColor: "#FF4FD8",
    borderRadius: 12,
    marginTop: 10,
    padding: 14,
  },
  syncButtonText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.65 },
  statusCard: {
    backgroundColor: "#1D0D44",
    borderColor: "#5A3C91",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
  },
  statusTitle: {
    color: "#2DE2E6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  statusText: { color: "#E9E3FF", fontSize: 12, lineHeight: 18, marginTop: 8 },
  messageText: {
    color: "#FFB3EC",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  teamList: {
    backgroundColor: "#241051",
    borderColor: "#5A3C91",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  teamTitle: {
    color: "#2DE2E6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  teamRow: { color: "#E9E3FF", fontSize: 12, marginTop: 6 },
});
