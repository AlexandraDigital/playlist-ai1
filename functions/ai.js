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
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a music expert.",
          },
          {
            role: "user",
            content: `Give me 10 songs for this vibe: "${query}". 
Only return a clean numbered list like:
1. Song - Artist
2. Song - Artist`,
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
