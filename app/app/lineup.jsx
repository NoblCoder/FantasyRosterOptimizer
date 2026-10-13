/** @format */

import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { positionColors } from "../src/data/roster";
import { useRoster } from "../src/context/RosterProvider";
import { ScalePressable, ScreenEntrance } from "../src/components/AnimatedUI";
import { buildHeadToHead, optimizeLocalLineup } from "../src/services/lineup";

export default function Lineup() {
  const [selected, setSelected] = useState(null);
  const { roster, opponentRoster, season, week } = useRoster();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const myLineup = useMemo(() => optimizeLocalLineup(roster, 1), [roster]);
  const opponentLineup = useMemo(
    () => optimizeLocalLineup(opponentRoster, 1),
    [opponentRoster],
  );
  const headToHead = useMemo(
    () => buildHeadToHead(myLineup, opponentLineup),
    [myLineup, opponentLineup],
  );
  const lineup = useMemo(
    () => [...myLineup.starters, ...myLineup.bench],
    [myLineup],
  );
  const starters = myLineup.starters;
  const total = myLineup.projectedTotal;
  const player = selected && lineup.find((item) => item.id === selected);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style='light' />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScreenEntrance
          style={[styles.container, isWide && styles.containerWide]}>
          <ScalePressable
            onPress={() => router.replace("/")}
            style={styles.backButton}>
            <Text style={styles.back}>‹ Dashboard</Text>
          </ScalePressable>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Week {week} lineup</Text>
              <Text style={styles.subtitle}>
                PPR · 1 FLEX · {season} season
              </Text>
            </View>
            <View style={styles.total}>
              <Text style={styles.totalNumber}>{total.toFixed(1)}</Text>
              <Text style={styles.totalLabel}>PROJECTED</Text>
            </View>
          </View>
          <View style={styles.explainer}>
            <Text style={styles.explainerTitle}>Your best lineup is ready</Text>
            <Text style={styles.explainerBody}>
              Recommendations weigh projections, matchup, weather, history, and
              usage trends.
            </Text>
          </View>

          <View style={styles.matchupCard}>
            <View style={styles.matchupHeader}>
              <Text style={styles.matchupTitle}>Head-to-head matchup</Text>
              <Text style={styles.matchupWin}>
                {headToHead.winProbability}% win odds
              </Text>
            </View>
            <Text style={styles.matchupSubtitle}>
              {opponentRoster.length
                ? `You are ${headToHead.totalEdge >= 0 ? "+" : ""}${headToHead.totalEdge.toFixed(1)} projected points versus your opponent lineup.`
                : "Add opponent players on the roster screen to unlock matchup-by-position edges."}
            </Text>
            {headToHead.matchups.map((slotMatchup) => (
              <View
                key={`${slotMatchup.slot}-${slotMatchup.mine?.id || "none"}`}
                style={styles.matchupRow}>
                <Text style={styles.matchupSlot}>{slotMatchup.slot}</Text>
                <View style={styles.matchupCenter}>
                  <Text style={styles.matchupNames}>
                    {slotMatchup.mine?.name || "-"} vs{" "}
                    {slotMatchup.theirs?.name || "-"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.matchupEdge,
                    slotMatchup.edge >= 0
                      ? styles.matchupEdgeGood
                      : styles.matchupEdgeBad,
                  ]}>
                  {slotMatchup.edge >= 0 ? "+" : ""}
                  {slotMatchup.edge.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>STARTERS</Text>
          {starters.map((item) => (
            <PlayerCard
              key={item.id}
              player={item}
              onPress={() => setSelected(item.id)}
            />
          ))}
          <Text style={styles.section}>BENCH RANKING</Text>
          {myLineup.bench.map((item, index) => (
            <PlayerCard
              key={item.id}
              player={item}
              rank={index + 1}
              onPress={() => setSelected(item.id)}
            />
          ))}
        </ScreenEntrance>
      </ScrollView>
      <Modal
        animationType='slide'
        transparent
        visible={Boolean(player)}
        onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.overlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            {player && (
              <>
                <View style={styles.handle} />
                <Text style={styles.detailTitle}>{player.name}</Text>
                <Text style={styles.detailMeta}>
                  {player.position} · {player.team} {player.opponent}
                </Text>
                <Text style={styles.detailScore}>
                  {player.score} <Text style={styles.detailLabel}>WPS</Text>
                </Text>
                <Detail
                  label='Weekly projection'
                  value={`${player.projection} points`}
                />
                <Detail label='Matchup' value={player.matchup} />
                <Detail label='Weather / stadium' value={player.weather} />
                <Detail label='Usage trend' value={player.usage} />
                <ScalePressable
                  onPress={() => setSelected(null)}
                  style={styles.close}>
                  <Text style={styles.closeText}>Done</Text>
                </ScalePressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function PlayerCard({ player, onPress, rank }) {
  return (
    <ScalePressable onPress={onPress} style={styles.player}>
      <View
        style={[
          styles.position,
          { backgroundColor: positionColors[player.position] },
        ]}>
        <Text style={styles.positionText}>{player.position}</Text>
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.name}>
          {rank ? `${rank}. ` : ""}
          {player.name}
        </Text>
        <Text style={styles.meta}>
          {player.team} · {player.opponent}
        </Text>
        <Text style={styles.reason}>{player.matchup}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.projection}>{player.projection.toFixed(1)}</Text>
        <Text style={styles.confidence}>
          {player.confidence ? `${player.confidence}%` : "--"} conf.
        </Text>
      </View>
    </ScalePressable>
  );
}
function Detail({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 21,
  },
  title: {
    color: "#FFF",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: { color: "#C7B9EE", fontSize: 12, marginTop: 4 },
  total: {
    alignItems: "flex-end",
    backgroundColor: "rgba(255, 228, 94, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  totalNumber: { color: "#FFE45E", fontSize: 25, fontWeight: "800" },
  totalLabel: {
    color: "#2DE2E6",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  explainer: {
    backgroundColor: "#371682",
    borderColor: "#A267FF",
    borderRadius: 16,
    borderWidth: 2,
    marginTop: 23,
    padding: 15,
  },
  explainerTitle: { color: "#FFF", fontWeight: "800" },
  explainerBody: {
    color: "#E5DEFF",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  matchupCard: {
    backgroundColor: "#200A4D",
    borderColor: "#614299",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 12,
  },
  matchupHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  matchupTitle: {
    color: "#2DE2E6",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  matchupWin: { color: "#FFE45E", fontSize: 12, fontWeight: "800" },
  matchupSubtitle: {
    color: "#CEBFF0",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  matchupRow: {
    alignItems: "center",
    borderTopColor: "#51387E",
    borderTopWidth: 1,
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 8,
  },
  matchupSlot: { color: "#2DE2E6", fontSize: 11, fontWeight: "800", width: 40 },
  matchupCenter: { flex: 1, paddingRight: 8 },
  matchupNames: { color: "#E9E3FF", fontSize: 11, lineHeight: 16 },
  matchupEdge: {
    fontSize: 12,
    fontWeight: "800",
    minWidth: 38,
    textAlign: "right",
  },
  matchupEdgeGood: { color: "#72F2A5" },
  matchupEdgeBad: { color: "#FF8BB0" },
  section: {
    color: "#2DE2E6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 25,
  },
  player: {
    alignItems: "center",
    backgroundColor: "#21104C",
    borderColor: "#493178",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 9,
    minHeight: 82,
    padding: 13,
    shadowColor: "#050014",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  position: {
    alignItems: "center",
    borderRadius: 9,
    height: 37,
    justifyContent: "center",
    width: 37,
  },
  positionText: { color: "#0B1630", fontSize: 10, fontWeight: "900" },
  playerInfo: { flex: 1, marginLeft: 12 },
  name: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  meta: { color: "#C8BCEB", fontSize: 11, marginTop: 3 },
  reason: { color: "#9D8BCE", fontSize: 10, marginTop: 5 },
  right: { alignItems: "flex-end" },
  projection: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  confidence: { color: "#2DE2E6", fontSize: 10, marginTop: 4 },
  overlay: {
    backgroundColor: "rgba(10, 3, 34, 0.78)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#28105B",
    borderColor: "#925CFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 2,
    padding: 22,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "#2DE2E6",
    borderRadius: 2,
    height: 4,
    marginBottom: 21,
    width: 36,
  },
  detailTitle: { color: "#FFF", fontSize: 25, fontWeight: "800" },
  detailMeta: { color: "#D0C4F0", fontSize: 13, marginTop: 4 },
  detailScore: {
    color: "#FFE45E",
    fontSize: 34,
    fontWeight: "800",
    marginVertical: 20,
  },
  detailLabel: { color: "#2DE2E6", fontSize: 12, letterSpacing: 1 },
  detailRow: {
    borderTopColor: "#6743AD",
    borderTopWidth: 1,
    paddingVertical: 13,
  },
  detailKey: {
    color: "#2DE2E6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  detailValue: { color: "#F2F4FB", fontSize: 14, marginTop: 5 },
  close: {
    alignItems: "center",
    backgroundColor: "#FF4FD8",
    borderRadius: 12,
    marginTop: 10,
    padding: 16,
  },
  closeText: { color: "#FFF", fontWeight: "800" },
});
