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

Based on this data, generate a 3-emoji "Signature" that captures the essence of their listening day:
1. GENRE emoji: A single emoji that best symbolizes the dominant musical genre (e.g. 🎺 for jazz, 🤠 for country, 🎸 for rock, 🌴 for reggaeton)
2. MOOD emoji: A single emoji that best represents the emotional mood/vibe (use the audio features as your primary guide — valence for happiness, energy for intensity, danceability for movement)
3. THEME emoji: A creative single emoji that represents the most interesting/common theme found in the song titles themselves (look for recurring words, imagery, or concepts across the titles)

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
