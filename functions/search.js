export async function onRequestGet(context) {
  const keys = [
    context.env.YOUTUBE_API_KEY_1,
    context.env.YOUTUBE_API_KEY_2,
  ].filter(Boolean);

  try {
    const url = new URL(context.request.url);
    const q = url.searchParams.get("q");

    if (!q) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    for (let key of keys) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(q)}&key=${key}`
      );

      const data = await res.json();

      if (data.error) continue;

      const valid = data.items?.filter((i) => i.id?.videoId) || [];

      if (valid.length) {
        return new Response(JSON.stringify({ items: valid }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ items: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ items: [] }), { status: 500 });
  }
}
