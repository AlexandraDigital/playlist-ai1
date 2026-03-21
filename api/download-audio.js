export const config = { maxDuration: 60 };

const INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.leptons.xyz',
];

export default async function handler(req, res) {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });

  let audioUrl, mimeType;
  for (const base of INSTANCES) {
    try {
      const r = await fetch(`${base}/streams/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!r.ok) continue;
      const data = await r.json();
      const best = (data.audioStreams || []).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (best?.url) { audioUrl = best.url; mimeType = best.mimeType || 'audio/webm'; break; }
    } catch { /* try next */ }
  }

  if (!audioUrl) return res.status(500).json({ error: 'No stream available' });

  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) return res.status(500).json({ error: 'Stream fetch failed' });

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Access-Control-Allow-Origin', '*');

  const reader = audioRes.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } finally {
    res.end();
  }
}
