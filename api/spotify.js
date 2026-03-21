export const config = { runtime: 'edge' };

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Spotify credentials not configured');
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get Spotify token');
  return data.access_token;
}

function trackToSong(track) {
  return {
    title: track.name,
    artist: track.artists?.[0]?.name || '',
    spotifyId: track.id,
    albumArt: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || null,
    albumName: track.album?.name || null,
    previewUrl: track.preview_url || null,
    spotifyUrl: track.external_urls?.spotify || null,
    videoId: null,
  };
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const seeds = searchParams.get('seeds');   // comma-separated Spotify track IDs
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    const token = await getSpotifyToken();

    // ── Mode 1: recommendations from seed track IDs ──
    if (seeds) {
      const res = await fetch(
        `https://api.spotify.com/v1/recommendations?seed_tracks=${encodeURIComponent(seeds)}&limit=${Math.min(limit, 100)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      const tracks = (data.tracks || []).map(trackToSong);
      return new Response(JSON.stringify({ tracks }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Mode 2: search for single track metadata ──
    if (!q) return new Response(JSON.stringify({ error: 'q or seeds required' }), { status: 400 });

    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await res.json();
    const track = data.tracks?.items?.[0];
    if (!track) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

    return new Response(JSON.stringify({
      spotifyId: track.id,
      albumArt: track.album.images[1]?.url || track.album.images[0]?.url,
      albumName: track.album.name,
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls.spotify,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
