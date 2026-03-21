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

  let audioUrl, mimeType;
  for (const base of INSTANCES) {
    try {
      const r = await fetch(`${base}/streams/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!r.ok) continue;
      const data = await r.json();
      const streams = (data.audioStreams || []).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const best = streams.find(s => s.mimeType?.includes('mp4')) || streams[0];
      if (best?.url) {
        audioUrl = best.url;
        mimeType = best.mimeType || 'audio/mp4';
        break;
      }
    } catch { /* try next */ }
  }

  if (!audioUrl) {
    return new Response(JSON.stringify({ error: 'No stream available' }), { status: 503 });
  }

  // Forward Range header so progress tracking works
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  const range = req.headers.get('range');
  if (range) headers['Range'] = range;

  const upstream = await fetch(audioUrl, { headers });
  if (!upstream.ok && upstream.status !== 206) {
    return new Response(JSON.stringify({ error: `Upstream error ${upstream.status}` }), { status: 500 });
  }

  const resHeaders = {
    'Content-Type': mimeType,
    'Access-Control-Allow-Origin': '*',
    'Accept-Ranges': 'bytes',
  };
  const cl = upstream.headers.get('Content-Length');
  const cr = upstream.headers.get('Content-Range');
  if (cl) resHeaders['Content-Length'] = cl;
  if (cr) resHeaders['Content-Range'] = cr;

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}
