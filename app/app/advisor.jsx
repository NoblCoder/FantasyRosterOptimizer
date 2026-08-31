import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
  const [rosterImage, setRosterImage] = useState(null);

  async function sendMessage(text = message) {
    const question = text.trim();
    if ((!question && !rosterImage) || isLoading) return;

    setMessage("");
    const image = rosterImage;
    setRosterImage(null);
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: question || "Analyze my roster screenshot for matchup-based moves.", imageUri: image?.uri }]);
    setIsLoading(true);
    try {
      const answer = await requestAdvice(question, roster, image?.dataUrl);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: answer }]);
    } catch (error) {
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: "assistant", error: true, text: error.message }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function chooseImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      mediaTypes: ["images"],
      quality: 0.5,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      setMessages((current) => [...current, { id: `error-${Date.now()}`, role: "assistant", error: true, text: "This image could not be prepared for analysis. Please choose another screenshot." }]);
      return;
    }
    const mimeType = asset.mimeType === "image/png" || asset.mimeType === "image/webp" ? asset.mimeType : "image/jpeg";
    setRosterImage({ uri: asset.uri, dataUrl: `data:${mimeType};base64,${asset.base64}` });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScreenEntrance style={styles.container}>
          <ScalePressable onPress={() => router.replace("/")} style={styles.backButton}><Text style={styles.back}>‹ Dashboard</Text></ScalePressable>
          <Text style={styles.eyebrow}>ROSTER IQ ASSISTANT</Text>
          <Text style={styles.title}>Talk through your next move.</Text>
          <Text style={styles.subtitle}>Advice is based on your in-app roster and projections, not live breaking news.</Text>

          <ScrollView contentContainerStyle={styles.messages} style={styles.messageList}>
            {messages.map((item) => (
              <View key={item.id} style={[styles.message, item.role === "user" ? styles.userMessage : styles.assistantMessage, item.error && styles.errorMessage]}>
                <Text style={styles.messageLabel}>{item.role === "user" ? "YOU" : "ROSTER IQ"}</Text>
                {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.messageImage} />}
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
          {rosterImage && <View style={styles.imagePreview}><Image source={{ uri: rosterImage.uri }} style={styles.previewImage} /><Text style={styles.previewText}>Roster screenshot ready to analyze</Text><ScalePressable onPress={() => setRosterImage(null)}><Text style={styles.removeImage}>Remove</Text></ScalePressable></View>}
          <View style={styles.composer}>
            <TextInput value={message} onChangeText={setMessage} placeholder="Ask about a trade, start/sit, or waiver..." placeholderTextColor="#9689BE" multiline style={styles.input} />
            <ScalePressable accessibilityLabel="Upload roster screenshot" disabled={isLoading} onPress={chooseImage} style={styles.upload}><Text style={styles.uploadText}>+</Text></ScalePressable>
            <ScalePressable accessibilityLabel="Send question" disabled={(!message.trim() && !rosterImage) || isLoading} onPress={() => sendMessage()} style={[styles.send, ((!message.trim() && !rosterImage) || isLoading) && styles.sendDisabled]}><Text style={styles.sendText}>↑</Text></ScalePressable>
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
  messageImage: { borderRadius: 10, height: 120, marginTop: 8, resizeMode: "cover", width: "100%" },
  promptList: { gap: 8, marginBottom: 12 },
  prompt: { backgroundColor: "#21104C", borderColor: "#50357D", borderRadius: 12, borderWidth: 1, padding: 12 },
  promptText: { color: "#DCD2F6", fontSize: 12, fontWeight: "600" },
  imagePreview: { alignItems: "center", backgroundColor: "#28105B", borderColor: "#6741B0", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 10, marginBottom: 8, padding: 8 },
  previewImage: { borderRadius: 7, height: 38, width: 38 },
  previewText: { color: "#E9E3FF", flex: 1, fontSize: 12, fontWeight: "600" },
  removeImage: { color: "#FF82C8", fontSize: 12, fontWeight: "700", padding: 4 },
  composer: { alignItems: "flex-end", backgroundColor: "#21104C", borderColor: "#8B5CFF", borderRadius: 16, borderWidth: 2, flexDirection: "row", gap: 8, padding: 8 },
  input: { color: "#FFF", flex: 1, fontSize: 14, maxHeight: 100, minHeight: 40, paddingHorizontal: 8, paddingVertical: 7 },
  send: { alignItems: "center", backgroundColor: "#FF4FD8", borderRadius: 11, height: 40, justifyContent: "center", width: 40 },
  upload: { alignItems: "center", backgroundColor: "#4A2D80", borderRadius: 11, height: 40, justifyContent: "center", width: 40 },
  uploadText: { color: "#2DE2E6", fontSize: 24, fontWeight: "600", lineHeight: 26 },
  sendDisabled: { backgroundColor: "#6D477B" },
  sendText: { color: "#FFF", fontSize: 22, fontWeight: "800", lineHeight: 24 },
});
