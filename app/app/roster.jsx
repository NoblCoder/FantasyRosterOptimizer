/** @format */

import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { playerSearchResults, positionColors } from "../src/data/roster";
import { useRoster } from "../src/context/RosterProvider";
import { ScalePressable, ScreenEntrance } from "../src/components/AnimatedUI";

export default function Roster() {
  const [query, setQuery] = useState("");
  const [activeTarget, setActiveTarget] = useState("me");
  const [manualName, setManualName] = useState("");
  const [manualPosition, setManualPosition] = useState("WR");
  const [manualProjection, setManualProjection] = useState("10.0");
  const [manualTeam, setManualTeam] = useState("");
  const [manualOpponent, setManualOpponent] = useState("");
  const {
    addPlayer,
    removePlayer,
    roster,
    opponentRoster,
    rosterSource,
    isHydratingRoster,
    refreshRosterFromBackend,
    week,
  } = useRoster();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const results = playerSearchResults.filter((player) =>
    player.name.toLowerCase().includes(query.toLowerCase()),
  );
  const activeRoster = activeTarget === "opponent" ? opponentRoster : roster;

  const tradeForPlayer = (player) => {
    const suffix = activeTarget === "opponent" ? "opp" : "me";
    addPlayer(
      { ...player, id: `${player.id}-${suffix}` },
      { target: activeTarget },
    );
    setQuery("");
  };

  function addManualPlayer() {
    const trimmedName = manualName.trim();
    if (!trimmedName) return;

    addPlayer(
      {
        id: `manual-${activeTarget}-${Date.now()}`,
        name: trimmedName,
        position: manualPosition,
        projection: Number(manualProjection) || 0,
        team: manualTeam.trim().toUpperCase() || "FA",
        opponent: manualOpponent.trim() || "TBD",
        matchup:
          activeTarget === "opponent"
            ? "Opponent slot manually added"
            : "Custom roster player",
      },
      { target: activeTarget },
    );
    setManualName("");
    setManualTeam("");
    setManualOpponent("");
  }

  async function refreshEspnRoster() {
    await refreshRosterFromBackend();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style='light' />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'>
        <ScreenEntrance
          style={[styles.container, isWide && styles.containerWide]}>
          <ScalePressable
            onPress={() => router.replace("/")}
            style={styles.backButton}>
            <Text style={styles.back}>‹ Dashboard</Text>
          </ScalePressable>
          <Text style={styles.title}>My roster</Text>
          <Text style={styles.subtitle}>
            Build both lineups so Roster IQ can show direct head-to-head matchup
            edges.
          </Text>
          <View style={styles.syncInfoRow}>
            <Text style={styles.syncInfoText}>
              Source:{" "}
              {rosterSource === "espn"
                ? "Synced ESPN roster"
                : "Local sample roster"}
            </Text>
            <ScalePressable
              onPress={refreshEspnRoster}
              style={styles.syncButton}
              disabled={isHydratingRoster}>
              <Text style={styles.syncButtonText}>
                {isHydratingRoster ? "Refreshing..." : "Refresh ESPN roster"}
              </Text>
            </ScalePressable>
          </View>
          <View style={styles.segmentRow}>
            <ScalePressable
              onPress={() => setActiveTarget("me")}
              style={[
                styles.segment,
                activeTarget === "me" && styles.segmentActive,
              ]}>
              <Text
                style={[
                  styles.segmentText,
                  activeTarget === "me" && styles.segmentTextActive,
                ]}>
                My players
              </Text>
            </ScalePressable>
            <ScalePressable
              onPress={() => setActiveTarget("opponent")}
              style={[
                styles.segment,
                activeTarget === "opponent" && styles.segmentActive,
              ]}>
              <Text
                style={[
                  styles.segmentText,
                  activeTarget === "opponent" && styles.segmentTextActive,
                ]}>
                Opponent players
              </Text>
            </ScalePressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder='Search NFL players'
            placeholderTextColor='#7081A8'
            style={styles.input}
          />
          {query.length > 0 && (
            <View style={styles.results}>
              {results.map((player) => (
                <ScalePressable
                  key={player.id}
                  onPress={() => tradeForPlayer(player)}
                  style={styles.result}>
                  <Text style={styles.resultName}>{player.name}</Text>
                  <Text style={styles.resultMeta}>
                    {player.position} · {player.team} · Add +
                  </Text>
                </ScalePressable>
              ))}
            </View>
          )}
          <View style={styles.manualCard}>
            <Text style={styles.manualTitle}>Quick add player</Text>
            <TextInput
              value={manualName}
              onChangeText={setManualName}
              placeholder='Player name'
              placeholderTextColor='#8D7AB8'
              style={styles.manualInput}
            />
            <View style={styles.manualRow}>
              {[
                { label: "QB", value: "QB" },
                { label: "RB", value: "RB" },
                { label: "WR", value: "WR" },
                { label: "TE", value: "TE" },
                { label: "DST", value: "DST" },
                { label: "K", value: "K" },
              ].map((option) => (
                <ScalePressable
                  key={option.value}
                  onPress={() => setManualPosition(option.value)}
                  style={[
                    styles.positionChoice,
                    manualPosition === option.value &&
                      styles.positionChoiceActive,
                  ]}>
                  <Text
                    style={[
                      styles.positionChoiceText,
                      manualPosition === option.value &&
                        styles.positionChoiceTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </ScalePressable>
              ))}
            </View>
            <View style={styles.manualTwoUp}>
              <TextInput
                value={manualProjection}
                onChangeText={setManualProjection}
                placeholder='Projection'
                placeholderTextColor='#8D7AB8'
                style={[styles.manualInput, styles.manualHalf]}
                keyboardType='decimal-pad'
              />
              <TextInput
                value={manualTeam}
                onChangeText={setManualTeam}
                placeholder='Team (e.g. DAL)'
                placeholderTextColor='#8D7AB8'
                style={[styles.manualInput, styles.manualHalf]}
                autoCapitalize='characters'
              />
            </View>
            <TextInput
              value={manualOpponent}
              onChangeText={setManualOpponent}
              placeholder='Opponent (e.g. @ NYG)'
              placeholderTextColor='#8D7AB8'
              style={styles.manualInput}
            />
            <ScalePressable
              onPress={addManualPlayer}
              style={styles.addManualButton}>
              <Text style={styles.addManualText}>
                Add to{" "}
                {activeTarget === "opponent" ? "opponent lineup" : "my roster"}
              </Text>
            </ScalePressable>
          </View>

          <View style={styles.heading}>
            <Text style={styles.headingText}>
              {activeTarget === "opponent" ? "OPPONENT LINEUP" : "ROSTER"}
            </Text>
            <Text style={styles.count}>{activeRoster.length} players</Text>
          </View>
          {activeRoster.map((player) => (
            <View key={player.id} style={styles.player}>
              <View
                style={[
                  styles.position,
                  { backgroundColor: positionColors[player.position] },
                ]}>
                <Text style={styles.positionText}>{player.position}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{player.name}</Text>
                <Text style={styles.meta}>
                  {player.team} · {player.opponent || `Week ${week}`}
                </Text>
              </View>
              <View style={styles.playerActions}>
                <Text style={styles.projected}>
                  {player.projection?.toFixed(1) || "--"}
                </Text>
                <ScalePressable
                  accessibilityLabel={`Remove ${player.name}`}
                  onPress={() =>
                    removePlayer(player.id, { target: activeTarget })
                  }>
                  <Text style={styles.remove}>Remove</Text>
                </ScalePressable>
              </View>
            </View>
          ))}
          <ScalePressable
            onPress={() => router.push("/lineup")}
            style={styles.save}>
            <Text style={styles.saveText}>Save roster & optimize →</Text>
          </ScalePressable>
        </ScreenEntrance>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#10072C" },
  scrollContent: { alignItems: "center", paddingBottom: 38 },
  container: { maxWidth: 680, padding: 20, width: "100%" },
  containerWide: { paddingHorizontal: 36 },
  backButton: { alignSelf: "flex-start" },
  back: {
    color: "#2DE2E6",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 4,
  },
  title: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 22,
  },
  subtitle: { color: "#C7B9EE", fontSize: 14, lineHeight: 20, marginTop: 7 },
  syncInfoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 12,
  },
  syncInfoText: { color: "#BDAFDF", flex: 1, fontSize: 12 },
  syncButton: {
    backgroundColor: "#3A1A78",
    borderColor: "#7A58C0",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  syncButtonText: { color: "#F4EDFF", fontSize: 11, fontWeight: "700" },
  segmentRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  segment: {
    backgroundColor: "#21104C",
    borderColor: "#5A3A8F",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  segmentActive: { backgroundColor: "#3B1A7E", borderColor: "#2DE2E6" },
  segmentText: { color: "#C7B9EE", fontSize: 12, fontWeight: "700" },
  segmentTextActive: { color: "#2DE2E6" },
  input: {
    backgroundColor: "#21104C",
    borderColor: "#8B5CFF",
    borderRadius: 14,
    borderWidth: 2,
    color: "#FFF",
    fontSize: 15,
    marginTop: 24,
    padding: 16,
  },
  results: {
    backgroundColor: "#2D1265",
    borderColor: "#9B67FF",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 7,
    overflow: "hidden",
  },
  result: { borderBottomColor: "#7048BD", borderBottomWidth: 1, padding: 13 },
  resultName: { color: "#FFF", fontWeight: "700" },
  resultMeta: { color: "#2DE2E6", fontSize: 12, marginTop: 3 },
  manualCard: {
    backgroundColor: "#1C0C43",
    borderColor: "#6541A8",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
  },
  manualTitle: {
    color: "#2DE2E6",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  manualInput: {
    backgroundColor: "#2A125E",
    borderColor: "#4D2F88",
    borderRadius: 10,
    borderWidth: 1,
    color: "#FFF",
    fontSize: 13,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  manualRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  positionChoice: {
    backgroundColor: "#2A125E",
    borderColor: "#4D2F88",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  positionChoiceActive: { borderColor: "#2DE2E6" },
  positionChoiceText: { color: "#CABEF0", fontSize: 11, fontWeight: "700" },
  positionChoiceTextActive: { color: "#2DE2E6" },
  manualTwoUp: { flexDirection: "row", gap: 8 },
  manualHalf: { flex: 1 },
  addManualButton: {
    alignItems: "center",
    backgroundColor: "#5030A5",
    borderRadius: 10,
    marginTop: 2,
    padding: 10,
  },
  addManualText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 28,
  },
  headingText: {
    color: "#2DE2E6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  count: { color: "#C7B9EE", fontSize: 12 },
  player: {
    alignItems: "center",
    backgroundColor: "#21104C",
    borderColor: "#493178",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 9,
    padding: 13,
    shadowColor: "#050014",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  position: {
    alignItems: "center",
    borderRadius: 9,
    height: 35,
    justifyContent: "center",
    width: 35,
  },
  positionText: { color: "#0B1630", fontSize: 10, fontWeight: "900" },
  info: { flex: 1, marginLeft: 12 },
  name: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  meta: { color: "#C2B5E8", fontSize: 12, marginTop: 3 },
  playerActions: { alignItems: "flex-end", gap: 6 },
  projected: { color: "#FFE45E", fontSize: 16, fontWeight: "800" },
  remove: { color: "#FF82C8", fontSize: 11, fontWeight: "700" },
  save: {
    alignItems: "center",
    backgroundColor: "#FF4FD8",
    borderRadius: 14,
    marginTop: 18,
    padding: 18,
    shadowColor: "#FF4FD8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  saveText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
