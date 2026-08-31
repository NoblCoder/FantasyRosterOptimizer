const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

export async function requestAdvice(message, roster) {
  const response = await fetch(`${apiUrl}/advice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, roster }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to get advice right now.");
  }

  return payload.answer;
}
