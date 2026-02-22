# Sonaara

A social music app that turns your daily listening into a shareable "sonic signature" — a short AI-generated description of your musical mood based on what you played yesterday.

## Features

- **Daily Signature** — Analyzes yesterday's Spotify listening history and generates a signature using Claude AI. Backfills up to 5 days of history automatically.
- **Friends** — Add friends by Spotify user ID and view their signatures and listening history.
- **Discover** — Swipe through tracks your friends have liked, filtered by genre. Like or skip to build your own library.
- **Songs** — Browse all tracks you've liked or skipped through Discover, with the ability to remove them.
- **Daily Cron** — A Vercel cron job refreshes every user's signature at 8 AM UTC so friends always see up-to-date data without requiring a login.

## Tech Stack

- **Framework**: Next.js 15 (App Router, TypeScript)
- **Auth**: Spotify OAuth 2.0 via iron-session (cookie-based)
- **Database**: Upstash Redis (user records, friend lists, liked/skipped tracks)
- **AI**: Anthropic Claude (claude-opus-4-6) for signature generation
- **Music**: Spotify Web API + Spotify Web Playback SDK
- **Hosting**: Vercel
- **Styling**: Tailwind CSS v4

## Project Structure

```
app/
  page.tsx                    # Login / landing page
  layout.tsx                  # Root layout (TimezoneSync)
  dashboard/page.tsx          # Main feed — signature, friends, history
  dashboard/loading.tsx       # SSR loading skeleton
  discover/page.tsx           # Discover screen
  songs/page.tsx              # Liked & skipped songs
  api/
    auth/login                # Spotify OAuth redirect
    auth/callback             # Token exchange + session setup
    auth/logout               # Session destruction
    discover/pool             # Friends' liked tracks pool
    discover/genres           # Available genres in pool
    discover/like             # Like a track (Spotify + Redis)
    discover/skip             # Skip a track
    songs/unlike              # Remove liked track
    songs/unskip              # Remove skipped track
    friends/ids               # Get/set friend IDs
    friends/data              # Fetch friend records
    signature                 # Generate signature on demand
    cron/refresh-signatures   # Daily signature refresh (Vercel cron)

components/
  BottomNav.tsx               # Home / Discover / Songs nav bar
  DiscoverView.tsx            # Swipe card UI with genre selector
  FriendsSection.tsx          # Friend management modal
  LastPlayedCard.tsx          # Most recent track with preview
  LoginButton.tsx             # Spotify login CTA
  SignatureCard.tsx           # Today's signature + history navigation
  SignatureHistory.tsx        # Past signature list
  SongsView.tsx               # Liked / Skipped subtab view
  TimezoneSync.tsx            # Detects timezone and syncs to cookie
  VinylLogo.tsx               # Animated vinyl SVG logo
  YesterdayTracks.tsx         # Yesterday's track list with previews

lib/
  claude.ts                   # Anthropic client + generateSignature()
  session.ts                  # iron-session helpers + token refresh
  spotify.ts                  # Spotify API calls (tracks, genres, audio features)
  store.ts                    # Upstash Redis — all user record operations

hooks/
  useSpotifyPlayer.ts         # Spotify Web Playback SDK hook
```

## Local Development

### Prerequisites

- Node.js 18+
- A [Spotify Developer](https://developer.spotify.com/dashboard) app with `http://localhost:3000/api/auth/callback` added as a redirect URI
- An [Anthropic API](https://console.anthropic.com) key
- An [Upstash Redis](https://upstash.com) database

### Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback

ANTHROPIC_API_KEY=your_anthropic_api_key

KV_REST_API_URL=your_upstash_redis_url
KV_REST_API_TOKEN=your_upstash_redis_token

SESSION_SECRET=any_32+_char_random_string

CRON_SECRET=any_random_string_for_cron_auth
```

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Testing the Cron Job Locally

```bash
curl -H "Authorization: Bearer <your_CRON_SECRET>" http://localhost:3000/api/cron/refresh-signatures
```

## Deployment (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Add all environment variables from `.env.local` to Vercel project settings.
3. The `vercel.json` cron runs automatically on the Pro plan or above.

## Key Data Model

Every user is stored in Redis under `user:<spotifyId>`:

```ts
{
  userId, userName, userImage,
  updatedAt,
  signature,           // today's AI-generated signature
  lastTrack,           // most recently played track
  signatureHistory,    // "YYYY-MM-DD" → Signature (last 60 days)
  friendIds,           // added friend Spotify IDs
  likedTracks,         // Spotify library cache (Discover pool filtering)
  discoverLikes,       // tracks liked via Sonaara Discover (Songs tab)
  skippedTrackIds,     // fast-lookup array of skipped track IDs
  skippedTracks,       // full skipped track objects (Songs tab display)
  refreshToken,        // Spotify refresh token (used by cron job)
  timezone,            // IANA timezone string e.g. "America/New_York"
}
```
