import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ScalePressable, ScreenEntrance } from "../src/components/AnimatedUI";
import { useRoster } from "../src/context/RosterProvider";
import { requestAdvice } from "../src/services/advice";

const starterPrompts = [
  "Who should I consider trading this week?",
  "Where is my lineup most vulnerable?",
  "Which bench player has the best upside?",
];

export default function Advisor() {
  const { roster } = useRoster();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: "welcome", role: "assistant", text: "Ask about your lineup, trade targets, or where to improve. I’ll use the roster in this app for context." },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage(text = message) {
    const question = text.trim();
    if (!question || isLoading) return;

    setMessage("");
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: question }]);
    setIsLoading(true);
    try {
      const answer = await requestAdvice(question, roster);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: answer }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: "assistant", error: true, text: error.message }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScreenEntrance style={styles.container}>
          <ScalePressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.back}>‹ Dashboard</Text></ScalePressable>
          <Text style={styles.eyebrow}>ROSTER IQ ASSISTANT</Text>
          <Text style={styles.title}>Talk through your next move.</Text>
          <Text style={styles.subtitle}>Advice is based on your in-app roster and projections, not live breaking news.</Text>

          <ScrollView contentContainerStyle={styles.messages} style={styles.messageList}>
            {messages.map((item) => (
              <View key={item.id} style={[styles.message, item.role === "user" ? styles.userMessage : styles.assistantMessage, item.error && styles.errorMessage]}>
                <Text style={styles.messageLabel}>{item.role === "user" ? "YOU" : "ROSTER IQ"}</Text>
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            ))}
            {isLoading && <View style={[styles.message, styles.assistantMessage]}><Text style={styles.messageLabel}>ROSTER IQ</Text><Text style={styles.messageText}>Sizing up your options...</Text></View>}
          </ScrollView>

          {messages.length === 1 && (
            <View style={styles.promptList}>
              {starterPrompts.map((prompt) => <ScalePressable key={prompt} onPress={() => sendMessage(prompt)} style={styles.prompt}><Text style={styles.promptText}>{prompt}</Text></ScalePressable>)}
            </View>
          )}
          <View style={styles.composer}>
            <TextInput value={message} onChangeText={setMessage} placeholder="Ask about a trade, start/sit, or waiver..." placeholderTextColor="#9689BE" multiline style={styles.input} />
            <ScalePressable accessibilityLabel="Send question" disabled={!message.trim() || isLoading} onPress={() => sendMessage()} style={[styles.send, (!message.trim() || isLoading) && styles.sendDisabled]}><Text style={styles.sendText}>↑</Text></ScalePressable>
          </View>
        </ScreenEntrance>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: "#10072C", flex: 1 },
  keyboard: { flex: 1 },
  container: { alignSelf: "center", flex: 1, maxWidth: 700, padding: 20, width: "100%" },
  backButton: { alignSelf: "flex-start" },
  back: { color: "#2DE2E6", fontSize: 14, fontWeight: "700", paddingVertical: 4 },
  eyebrow: { color: "#2DE2E6", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginTop: 20 },
  title: { color: "#FFF", fontSize: 29, fontWeight: "800", letterSpacing: -0.6, marginTop: 7 },
  subtitle: { color: "#C7B9EE", fontSize: 13, lineHeight: 19, marginTop: 6 },
  messageList: { flex: 1, marginTop: 18 },
  messages: { gap: 10, paddingBottom: 12 },
  message: { borderRadius: 16, maxWidth: "91%", padding: 14 },
  assistantMessage: { alignSelf: "flex-start", backgroundColor: "#2A115E", borderColor: "#6741B0", borderWidth: 1 },
  userMessage: { alignSelf: "flex-end", backgroundColor: "#6E2878" },
  errorMessage: { backgroundColor: "#5A1D44", borderColor: "#FF82C8" },
  messageLabel: { color: "#2DE2E6", fontSize: 9, fontWeight: "800", letterSpacing: 0.9 },
  messageText: { color: "#F6F2FF", fontSize: 14, lineHeight: 20, marginTop: 5 },
  promptList: { gap: 8, marginBottom: 12 },
  prompt: { backgroundColor: "#21104C", borderColor: "#50357D", borderRadius: 12, borderWidth: 1, padding: 12 },
  promptText: { color: "#DCD2F6", fontSize: 12, fontWeight: "600" },
  composer: { alignItems: "flex-end", backgroundColor: "#21104C", borderColor: "#8B5CFF", borderRadius: 16, borderWidth: 2, flexDirection: "row", gap: 10, padding: 8 },
  input: { color: "#FFF", flex: 1, fontSize: 14, maxHeight: 100, minHeight: 40, paddingHorizontal: 8, paddingVertical: 7 },
  send: { alignItems: "center", backgroundColor: "#FF4FD8", borderRadius: 11, height: 40, justifyContent: "center", width: 40 },
  sendDisabled: { backgroundColor: "#6D477B" },
  sendText: { color: "#FFF", fontSize: 22, fontWeight: "800", lineHeight: 24 },
});
