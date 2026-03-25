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

// Module-level token cache — shared across requests in the same Cloudflare isolate
// This means 20 parallel song requests reuse the same token instead of each fetching one
let cachedToken = null;
let tokenExpiry = 0;

async function getSpotifyToken(clientId, clientSecret) {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(
      tokenData.error_description ||
        "Failed to get Spotify access token. Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET."
    );
  }

  cachedToken = tokenData.access_token;
  // Cache with 60s buffer before actual expiry
  tokenExpiry = now + (tokenData.expires_in - 60) * 1000;
  return cachedToken;
}

export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) return json200({ track: null, error: "Missing query" });

  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    return json200({
      track: null,
      error: "SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is not set. Go to Cloudflare Pages → Settings → Environment Variables and add both.",
    });
  }

  try {
    const accessToken = await getSpotifyToken(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET);

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await searchRes.json();

    if (!searchRes.ok) {
      // If token was rejected (401), clear the cache so next request gets a fresh token
      if (searchRes.status === 401) {
        cachedToken = null;
        tokenExpiry = 0;
      }
      return json200({
        track: null,
        error: data.error?.message || `Spotify search failed (status ${searchRes.status})`,
      });
    }

    const track = data.tracks?.items?.[0];
    if (!track) return json200({ track: null });

    return json200({
      track: {
        title: `${track.name} - ${track.artists[0].name}`,
        embedUrl: `https://open.spotify.com/embed/track/${track.id}`,
      },
    });
  } catch (e) {
    return json200({ track: null, error: e.message });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
