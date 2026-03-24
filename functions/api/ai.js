export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const query = body.query;

    console.log("Query:", query);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Give me 8 songs (artist - title) for this vibe: ${query}`,
          },
        ],
      }),
    });

    const text = await res.text(); // 🔥 IMPORTANT
    console.log("Groq raw:", text);

    return new Response(text, {
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("AI ERROR:", e);

    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500 }
    );
  }
}
