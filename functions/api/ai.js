export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const body = await request.json();
    const query = body.query || "music";

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a music expert. Return ONLY a list of 8 songs (song - artist), no extra text.",
            },
            {
              role: "user",
              content: `Give me songs for this vibe: ${query}`,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "AI crashed",
        details: err.message,
      }),
      { status: 500 }
    );
  }
}
