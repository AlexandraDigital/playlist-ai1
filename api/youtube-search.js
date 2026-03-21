export const config = { runtime: 'edge' };

const INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.leptons.xyz',
  'https://pa.il.sable.cc',
];

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  if (!q) {
    return new Response(JSON.stringify({ error: 'q required' }), { status: 400 });
  }

  for (const base of INSTANCES) {
    try {
      const r = await fetch(`${base}/search?q=${encodeURIComponent(q)}&filter=videos`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!r.ok) continue;
      const data = await r.json();
      const items = data.items || [];
      const video = items.find(i => i.url?.includes('watch'));
      if (video) {
        const videoId = new URLSearchParams(video.url.split('?')[1]).get('v') || video.url.split('v=')[1];
        return new Response(JSON.stringify({ videoId, title: video.title, thumbnail: video.thumbnail }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch { /* try next */ }
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
}
