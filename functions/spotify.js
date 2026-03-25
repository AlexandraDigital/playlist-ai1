export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return new Response(JSON.stringify({ error: "Missing query" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 🔐 Get Spotify token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization":
          "Basic " +
          btoa(env.SPOTIFY_CLIENT_ID + ":" + env.SPOTIFY_CLIENT_SECRET),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 🔍 Search track
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await searchRes.json();
    const track = data.tracks?.items?.[0];

    if (!track) {
      return new Response(JSON.stringify({ track: null }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        track: {
          title: `${track.name} - ${track.artists[0].name}`,
          embedUrl: `https://open.spotify.com/embed/track/${track.id}`,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}
