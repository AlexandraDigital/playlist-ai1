export async function onRequestPost(context) {
  try {
    const { query } = await context.request.json();

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${context.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // fast + good
        messages: [
          {
            role: "user",
            content: `Give me 10 songs for this vibe: ${query}. Only list song name and artist.`,
          },
        ],
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "AI failed" }), {
      status: 500,
    });
  }
}
