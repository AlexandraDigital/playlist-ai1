const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json200 = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams.get("q");

  if (!q) return json200({ items: [] });

  if (!env.YOUTUBE_API_KEY) {
    return json200({
      items: [],
      error: "YOUTUBE_API_KEY is not set. Go to Cloudflare Pages → Settings → Environment Variables and add YOUTUBE_API_KEY.",
    });
  }

  try {
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(q)}&key=${env.YOUTUBE_API_KEY}&maxResults=1`
    );
    const ytData = await ytRes.json();

    if (!ytRes.ok || ytData.error) {
      return json200({
        items: [],
        error: ytData.error?.message || `YouTube API error (status ${ytRes.status})`,
      });
    }

    return json200({ items: ytData.items || [] });
  } catch (e) {
    return json200({ items: [], error: e.message });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
