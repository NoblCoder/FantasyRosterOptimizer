import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { playerSearchResults, positionColors } from "../src/data/roster";
import { useRoster } from "../src/context/RosterProvider";
import { ScalePressable, ScreenEntrance } from "../src/components/AnimatedUI";

export default function Roster() {
  const [query, setQuery] = useState("");
  const { addPlayer, removePlayer, roster } = useRoster();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const results = playerSearchResults.filter((player) => player.name.toLowerCase().includes(query.toLowerCase()));
  const tradeForPlayer = (player) => {
    addPlayer(player);
    setQuery("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <ScreenEntrance style={[styles.container, isWide && styles.containerWide]}>
        <ScalePressable onPress={() => router.replace("/")} style={styles.backButton}><Text style={styles.back}>‹ Dashboard</Text></ScalePressable>
        <Text style={styles.title}>My roster</Text>
        <Text style={styles.subtitle}>Add players, then let Roster IQ find your highest-upside lineup.</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search NFL players" placeholderTextColor="#7081A8" style={styles.input} />
        {query.length > 0 && (
          <View style={styles.results}>
            {results.map((player) => <ScalePressable key={player.id} onPress={() => tradeForPlayer(player)} style={styles.result}><Text style={styles.resultName}>{player.name}</Text><Text style={styles.resultMeta}>{player.position} · {player.team} · Add +</Text></ScalePressable>)}
          </View>
        )}
        <View style={styles.heading}><Text style={styles.headingText}>ROSTER</Text><Text style={styles.count}>{roster.length} players</Text></View>
        {roster.map((player) => (
          <View key={player.id} style={styles.player}>
            <View style={[styles.position, { backgroundColor: positionColors[player.position] }]}><Text style={styles.positionText}>{player.position}</Text></View>
            <View style={styles.info}><Text style={styles.name}>{player.name}</Text><Text style={styles.meta}>{player.team} · {player.opponent || "Week 8"}</Text></View>
            <View style={styles.playerActions}>
              <Text style={styles.projected}>{player.projection?.toFixed(1) || "--"}</Text>
              <ScalePressable accessibilityLabel={`Remove ${player.name}`} onPress={() => removePlayer(player.id)}><Text style={styles.remove}>Remove</Text></ScalePressable>
            </View>
          </View>
        ))}
        <ScalePressable onPress={() => router.push("/lineup")} style={styles.save}><Text style={styles.saveText}>Save roster & optimize →</Text></ScalePressable>
        </ScreenEntrance>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#10072C" }, scrollContent: { alignItems: "center", paddingBottom: 38 }, container: { maxWidth: 680, padding: 20, width: "100%" }, containerWide: { paddingHorizontal: 36 },
  backButton: { alignSelf: "flex-start" }, back: { color: "#2DE2E6", fontSize: 14, fontWeight: "700", paddingVertical: 4 }, title: { color: "#FFF", fontSize: 32, fontWeight: "800", letterSpacing: -0.5, marginTop: 22 }, subtitle: { color: "#C7B9EE", fontSize: 14, lineHeight: 20, marginTop: 7 },
  input: { backgroundColor: "#21104C", borderColor: "#8B5CFF", borderRadius: 14, borderWidth: 2, color: "#FFF", fontSize: 15, marginTop: 24, padding: 16 },
  results: { backgroundColor: "#2D1265", borderColor: "#9B67FF", borderRadius: 12, borderWidth: 1, marginTop: 7, overflow: "hidden" },
  result: { borderBottomColor: "#7048BD", borderBottomWidth: 1, padding: 13 }, resultName: { color: "#FFF", fontWeight: "700" }, resultMeta: { color: "#2DE2E6", fontSize: 12, marginTop: 3 },
  heading: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 28 }, headingText: { color: "#2DE2E6", fontSize: 11, fontWeight: "800", letterSpacing: 1 }, count: { color: "#C7B9EE", fontSize: 12 },
  player: { alignItems: "center", backgroundColor: "#21104C", borderColor: "#493178", borderRadius: 14, borderWidth: 1, flexDirection: "row", marginBottom: 9, padding: 13, shadowColor: "#050014", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8 },
  position: { alignItems: "center", borderRadius: 9, height: 35, justifyContent: "center", width: 35 }, positionText: { color: "#0B1630", fontSize: 10, fontWeight: "900" },
  info: { flex: 1, marginLeft: 12 }, name: { color: "#FFF", fontSize: 15, fontWeight: "700" }, meta: { color: "#C2B5E8", fontSize: 12, marginTop: 3 }, playerActions: { alignItems: "flex-end", gap: 6 }, projected: { color: "#FFE45E", fontSize: 16, fontWeight: "800" }, remove: { color: "#FF82C8", fontSize: 11, fontWeight: "700" },
  save: { alignItems: "center", backgroundColor: "#FF4FD8", borderRadius: 14, marginTop: 18, padding: 18, shadowColor: "#FF4FD8", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15 }, saveText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
