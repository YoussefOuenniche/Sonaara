import Anthropic from "@anthropic-ai/sdk";
import type { TrackWithGenres, AggregatedAudioFeatures, Signature } from "@/types";

const client = new Anthropic();

export async function generateSignature(
  tracks: TrackWithGenres[],
  audioFeatures: AggregatedAudioFeatures | null
): Promise<Signature> {
  const trackList = tracks
    .map((t) => `"${t.name}" by ${t.artists.join(", ")}`)
    .join("\n");

  const allGenres = tracks.flatMap((t) => t.genres);
  const genreCounts: Record<string, number> = {};
  for (const g of allGenres) {
    genreCounts[g] = (genreCounts[g] ?? 0) + 1;
  }
  const dominantGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g);

  const audioSection = audioFeatures
    ? `Audio profile (0–1 scale):
- Valence (happiness): ${audioFeatures.avgValence.toFixed(2)}
- Energy: ${audioFeatures.avgEnergy.toFixed(2)}
- Danceability: ${audioFeatures.avgDanceability.toFixed(2)}
- Acousticness: ${audioFeatures.avgAcousticness.toFixed(2)}
- Average tempo: ${Math.round(audioFeatures.avgTempo)} BPM`
    : "Audio profile: not available";

  const prompt = `You are analyzing a user's Spotify listening history from yesterday (${tracks.length} tracks).

Tracks listened to:
${trackList}

Dominant genres: ${dominantGenres.length ? dominantGenres.join(", ") : "unknown"}

${audioSection}

Generate a 3-emoji "Signature" that is SPECIFIC to this person's actual listening — not generic defaults.

RULES (follow strictly):
- Every emoji must be directly justified by the data above. If you cannot justify it, pick something else.
- The 3 emojis must be visually and conceptually DISTINCT from each other — no overlapping vibes.
- NEVER use these overused defaults unless the data strongly demands it: 🌙 🎵 🎶 🎤 🎧 ⭐ ✨ 💫
- If audio profile is unavailable, derive mood entirely from the energy/tone implied by the track titles and artists.

1. GENRE emoji: Represents the dominant musical genre. Be specific — not just "music" but the actual genre character. Examples: 🎺 jazz, 🤠 country, 🎸 rock, 🌴 reggaeton, 🏙️ hip-hop, 🎹 classical/piano, 🪕 folk/americana, 🎻 strings/orchestral, 🔊 electronic/club.

2. MOOD emoji: Represents the emotional energy of the session. Use audio features if available; otherwise read the mood from the artists and titles themselves. Examples: 🔥 high energy, 💔 heartbreak, 😤 defiant, 🥲 bittersweet, 😤 aggressive, 🌊 flowing/calm, 💃 euphoric, 😮‍💨 introspective. Avoid 🌙 unless the titles/artists genuinely evoke nighttime.

3. THEME emoji: The most interesting recurring concept, image, or feeling found in the song TITLES specifically — not the genre or mood again. Read the actual words. Examples: if many songs mention love → 💌, roads/travel → 🛣️, money → 💸, fighting → 🥊, nature → 🌿, city → 🏙️, nostalgia → 📼.

Respond ONLY with valid JSON in exactly this format, no other text:
{
  "genre": "<emoji>",
  "genreLabel": "<1-3 word label>",
  "mood": "<emoji>",
  "moodLabel": "<1-3 word label>",
  "theme": "<emoji>",
  "themeLabel": "<1-3 word label>"
}`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude returned invalid JSON for signature");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Signature;
  return parsed;
}
