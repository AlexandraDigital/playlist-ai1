export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    if (!query) {
      return new Response(JSON.stringify({ error: "No query" }), {
        status: 400,
      });
    }

    const YT_KEY = env.YOUTUBE_API_KEY;

    const yt = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YT_KEY}`
    );

    const data = await yt.json();

    const item = data.items?.[0];

    if (!item) {
      return new Response(JSON.stringify(null), { status: 200 });
    }

    return new Response(
      JSON.stringify({
        title: item.snippet.title,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails.default.url,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
