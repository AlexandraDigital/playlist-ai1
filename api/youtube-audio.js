const INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.leptons.xyz',
];

export default async function handler(req, res) {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });

  let lastErr;
  for (const base of INSTANCES) {
    try {
      const r = await fetch(`${base}/streams/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!r.ok) continue;
      const data = await r.json();
      const streams = (data.audioStreams || []).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const best = streams[0];
      if (best?.url) {
        return res.json({ url: best.url, mimeType: best.mimeType || 'audio/webm' });
      }
    } catch (e) { lastErr = e; }
  }

  res.status(500).json({ error: lastErr?.message || 'No stream available' });
}
