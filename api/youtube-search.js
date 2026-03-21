const INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.leptons.xyz',
];

export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });

  for (const base of INSTANCES) {
    try {
      const r = await fetch(`${base}/search?q=${encodeURIComponent(q)}&filter=videos`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!r.ok) continue;
      const data = await r.json();
      const items = data.items || [];
      const video = items.find(i => i.url && i.url.includes('watch'));
      if (video) {
        const videoId = new URLSearchParams(video.url.split('?')[1]).get('v') || video.url.split('v=')[1];
        return res.json({ videoId, title: video.title, thumbnail: video.thumbnail });
      }
    } catch { /* try next */ }
  }

  res.status(404).json({ error: 'Not found' });
}
