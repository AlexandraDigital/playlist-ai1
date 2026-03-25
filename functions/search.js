export async function onRequestGet({ url, env }) {
  const q = url.searchParams.get("q");
  if (!q) return new Response(JSON.stringify({ items: [] }));

  // YouTube API (YT_API_KEY required in Pages variables)
  const ytRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&key=${env.YT_API_KEY}&maxResults=1`
  );
  const ytData = await ytRes.json();
  if (ytData.items?.length) return new Response(JSON.stringify({ items: ytData.items }));

  return new Response(JSON.stringify({ items: [] }));
}
