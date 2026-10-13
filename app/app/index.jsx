/** @format */

import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useRoster } from "../src/context/RosterProvider";
import { ScalePressable, ScreenEntrance } from "../src/components/AnimatedUI";
import { optimizeLocalLineup } from "../src/services/lineup";

export default function Dashboard() {
  const { roster, opponentRoster, season, week } = useRoster();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const myLineup = optimizeLocalLineup(roster, 1);
  const opponentLineup = optimizeLocalLineup(opponentRoster, 1);
  const starterProjection = myLineup.projectedTotal;
  const edge = Number(
    (myLineup.projectedTotal - opponentLineup.projectedTotal).toFixed(1),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style='light' />
      <ScreenEntrance
        style={[styles.container, isWide && styles.containerWide]}>
        <Text style={styles.eyebrow}>
          WEEK {week} · {season}
        </Text>
        <Text style={styles.title}>Roster IQ</Text>
        <Text style={styles.subtitle}>Make every start with conviction.</Text>

        <View style={styles.scoreCard}>
          <View style={styles.cardGlow} />
          <Text style={styles.cardLabel}>THIS WEEK'S EDGE</Text>
          <Text style={styles.score}>
            {starterProjection.toFixed(1)}{" "}
            <Text style={styles.points}>PTS</Text>
          </Text>
          <Text style={styles.cardBody}>
            Your projected total with the recommended lineup.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.matchupEdge}>
            Matchup edge:{" "}
            {opponentRoster.length
              ? `${edge >= 0 ? "+" : ""}${edge} vs opponent`
              : "Add opponent players to compare"}
          </Text>
          <Text style={styles.updated}>Data refreshed today at 8:30 AM</Text>
        </View>

        <ScalePressable
          onPress={() => router.push("/lineup")}
          style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            Optimize my lineup <Text style={styles.buttonArrow}>→</Text>
          </Text>
        </ScalePressable>
        <ScalePressable
          onPress={() => router.push("/roster")}
          style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>
            Manage roster{" "}
            <Text style={styles.rosterCount}>{roster.length} players</Text>
          </Text>
        </ScalePressable>
        <ScalePressable
          onPress={() => router.push("/advisor")}
          style={styles.advisorButton}>
          <Text style={styles.advisorButtonText}>
            Ask Roster IQ <Text style={styles.advisorBadge}>AI</Text>
          </Text>
        </ScalePressable>
        <ScalePressable
          onPress={() => router.push("/espn-setup")}
          style={styles.setupButton}>
          <Text style={styles.setupButtonText}>Connect ESPN league</Text>
        </ScalePressable>

        <View style={styles.tip}>
          <Text style={styles.tipLabel}>WEEKLY INSIGHT</Text>
          <Text style={styles.tipText}>
            Weather is expected to lower passing volume in Baltimore. Tee
            Higgins has been adjusted down 1.1 points.
          </Text>
        </View>
      </ScreenEntrance>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#10072C" },
  container: {
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
    maxWidth: 620,
    padding: 24,
    width: "100%",
  },
  containerWide: { paddingHorizontal: 38 },
  eyebrow: {
    color: "#2DE2E6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 8,
  },
  subtitle: { color: "#C7B9EE", fontSize: 17, marginTop: 5 },
  scoreCard: {
    backgroundColor: "#371682",
    borderColor: "#A267FF",
    borderRadius: 22,
    borderWidth: 2,
    marginTop: 38,
    overflow: "hidden",
    padding: 22,
  },
  cardGlow: {
    backgroundColor: "rgba(45, 226, 230, 0.16)",
    borderRadius: 100,
    height: 150,
    position: "absolute",
    right: -76,
    top: -90,
    width: 150,
  },
  cardLabel: {
    color: "#2DE2E6",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  score: { color: "#FFE45E", fontSize: 43, fontWeight: "800", marginTop: 9 },
  points: { color: "#E0D7FF", fontSize: 13, letterSpacing: 1 },
  cardBody: { color: "#F1EDFF", fontSize: 14, lineHeight: 20, marginTop: 7 },
  divider: { backgroundColor: "#835BE0", height: 1, marginVertical: 16 },
  matchupEdge: {
    color: "#2DE2E6",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  updated: { color: "#CBBEFA", fontSize: 11 },
  primaryButton: {
    backgroundColor: "#FF4FD8",
    borderRadius: 14,
    marginTop: 28,
    padding: 18,
    shadowColor: "#FF4FD8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 15,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  buttonArrow: { fontSize: 20 },
  secondaryButton: {
    backgroundColor: "#21104C",
    borderColor: "#7A4DDB",
    borderRadius: 14,
    borderWidth: 2,
    marginTop: 12,
    padding: 16,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  advisorButton: {
    alignItems: "center",
    borderColor: "#2DE2E6",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 15,
  },
  advisorButtonText: { color: "#E9E3FF", fontSize: 15, fontWeight: "700" },
  advisorBadge: { color: "#2DE2E6", fontSize: 11, letterSpacing: 1 },
  setupButton: {
    alignItems: "center",
    backgroundColor: "#2A145F",
    borderColor: "#4F3891",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 15,
  },
  setupButtonText: { color: "#EFE8FF", fontSize: 14, fontWeight: "700" },
  rosterCount: { color: "#2DE2E6", fontWeight: "700" },
  tip: {
    borderLeftColor: "#2DE2E6",
    borderLeftWidth: 3,
    marginTop: 38,
    paddingLeft: 13,
  },
  tipLabel: {
    color: "#2DE2E6",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tipText: { color: "#D8D0F3", fontSize: 12, lineHeight: 18, marginTop: 6 },
});
