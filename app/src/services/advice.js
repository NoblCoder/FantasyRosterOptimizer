/** @format */

const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

export async function requestAdvice(
  message,
  roster,
  imageDataUrl,
  opponentRoster = [],
) {
  const response = await fetch(`${apiUrl}/advice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, roster, imageDataUrl, opponentRoster }),
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || "Unable to get advice right now.");
  }

  return payload.answer;
}
