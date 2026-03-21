export const config = { runtime: 'edge' };

const INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.leptons.xyz',
  'https://pa.il.sable.cc',
];

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('videoId');
  if (!videoId) {
    return new Response(JSON.stringify({ error: 'videoId required' }), { status: 400 });
  }

  for (const base of INSTANCES) {
    try {
      const r = await fetch(`${base}/streams/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!r.ok) continue;
      const data = await r.json();
      const streams = (data.audioStreams || []).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      // Prefer opus/webm or mp4a for broad browser support
      const best = streams.find(s => s.mimeType?.includes('mp4')) || streams[0];
      if (best?.url) {
        // Redirect — <audio> elements follow cross-origin redirects without CORS enforcement
        return Response.redirect(best.url, 302);
      }
    } catch { /* try next instance */ }
  }

  return new Response(JSON.stringify({ error: 'No stream available from any Piped instance' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
