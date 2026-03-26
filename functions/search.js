const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json200 = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

// Use Odesli (song.link) to find the Spotify track embed URL from a YouTube video ID.
// Free, no API key required. Returns null if not found.
async function getSpotifyViaOdesli(youtubeVideoId) {
  try {
    const ytUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
    const odesliUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(ytUrl)}&songIfSingle=true`;
    const res = await fetch(odesliUrl, {
      headers: { "User-Agent": "playlist-ai/1.0" },
      // 4-second timeout via AbortSignal
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const spotifyUrl = data.linksByPlatform?.spotify?.url;
    if (!spotifyUrl) return null;
    const match = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    return `https://open.spotify.com/embed/track/${match[1]}`;
  } catch {
    // Odesli timed out or failed — not critical, just no Spotify embed
    return null;
  }
}

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams.get("q");

  if (!q) return json200({ items: [] });

  if (!env.YOUTUBE_API_KEY) {
    return json200({
      items: [],
      error: "YOUTUBE_API_KEY is not set. Go to Cloudflare Pages → Settings → Environment Variables and add YOUTUBE_API_KEY.",
    });
  }

  try {
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(q)}&key=${env.YOUTUBE_API_KEY}&maxResults=1`
    );
    const ytData = await ytRes.json();

    if (!ytRes.ok || ytData.error) {
      return json200({
        items: [],
        error: ytData.error?.message || `YouTube API error (status ${ytRes.status})`,
      });
    }

    const items = ytData.items || [];

    // If YouTube returned a video, look up the Spotify equivalent via Odesli (free, no API key)
    let spotifyEmbedUrl = null;
    if (items.length > 0 && items[0].id?.videoId) {
      spotifyEmbedUrl = await getSpotifyViaOdesli(items[0].id.videoId);
    }

    return json200({ items, spotifyEmbedUrl });
  } catch (e) {
    return json200({ items: [], error: e.message });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
