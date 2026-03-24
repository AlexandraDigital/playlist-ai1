export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const q = url.searchParams.get("q");

    if (!q) {
      return new Response(
        JSON.stringify({ error: "Missing query" }),
        { status: 400 }
      );
    }

    if (!context.env.YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing YOUTUBE_API_KEY" }),
        { status: 500 }
      );
    }

    const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&q=${encodeURIComponent(q)}&key=${context.env.YOUTUBE_API_KEY}`;

    const res = await fetch(endpoint);

    if (!res.ok) {
      const text = await res.text();
      console.error("YouTube API ERROR:", text);

      return new Response(
        JSON.stringify({ error: "YouTube API failed", details: text }),
        { status: res.status }
      );
    }

    const data = await res.json();

    // 🚨 Handle quota / API errors
    if (data.error) {
      console.error("YT ERROR:", data.error);
      return new Response(
        JSON.stringify({ error: data.error.message }),
        { status: 500 }
      );
    }

    // 🚨 No results fallback
    if (!data.items || data.items.length === 0) {
      return new Response(
        JSON.stringify({ items: [] }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("SEARCH CRASH:", e);

    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500 }
    );
  }
}
