export async function onRequest(context) {
  const { request } = context;

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Range",
      },
    });
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return new Response(JSON.stringify({ error: "Missing videoId" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  // Try multiple Cobalt instances in order
  const COBALT_INSTANCES = [
    "https://api.cobalt.tools/",
    "https://cobalt.api.timelessnesses.me/",
    "https://co.wuk.sh/",
  ];

  const cobaltBody = JSON.stringify({
    url: `https://www.youtube.com/watch?v=${videoId}`,
    downloadMode: "audio",
    audioFormat: "mp3",
    filenameStyle: "basic",
  });

  let audioUrl = null;
  let lastError = "All Cobalt instances failed";

  for (const instance of COBALT_INSTANCES) {
    try {
      const cobaltRes = await fetch(instance, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: cobaltBody,
      });

      if (!cobaltRes.ok) {
        lastError = `Cobalt ${instance} returned ${cobaltRes.status}`;
        continue;
      }

      const data = await cobaltRes.json();

      // Handle all Cobalt response status types
      if (data.status === "error") {
        lastError = data.error?.code || data.text || "Cobalt error";
        continue;
      }

      // stream/tunnel/redirect all have data.url
      if (data.url) {
        audioUrl = data.url;
        break;
      }

      // picker type: use the audio field
      if (data.audio) {
        audioUrl = data.audio;
        break;
      }

      // picker with picker array
      if (data.picker?.length) {
        audioUrl = data.picker[0].url;
        break;
      }

      lastError = `Cobalt returned unknown format: ${JSON.stringify(data).slice(0, 100)}`;
    } catch (e) {
      lastError = `Cobalt fetch error: ${e.message}`;
    }
  }

  if (!audioUrl) {
    return new Response(JSON.stringify({ error: lastError }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    // Forward Range header from browser so seeking works
    const rangeHeader = request.headers.get("Range");
    const fetchHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    };
    if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

    const audioRes = await fetch(audioUrl, { headers: fetchHeaders });

    if (!audioRes.ok && audioRes.status !== 206) {
      throw new Error(`Audio stream returned ${audioRes.status}`);
    }

    const responseHeaders = {
      "Content-Type": audioRes.headers.get("Content-Type") || "audio/mpeg",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    };

    // Forward content-range and content-length for seeking support
    const contentRange = audioRes.headers.get("Content-Range");
    const contentLength = audioRes.headers.get("Content-Length");
    if (contentRange) responseHeaders["Content-Range"] = contentRange;
    if (contentLength) responseHeaders["Content-Length"] = contentLength;

    return new Response(audioRes.body, {
      status: audioRes.status,
      headers: responseHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
