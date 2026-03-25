export async function onRequestPost(context) {
  try {
    const { query } = await context.request.json();

    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${context.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            {
              role: "user",
              content: `Give 10 songs for: ${query}. Format: Artist - Song`,
            },
          ],
        }),
      }
    );

    const data = await res.json();

    const content = data.choices?.[0]?.message?.content || "";

    const songs = content
      .split("\n")
      .map((l) => l.replace(/^\d+\.\s*/, "").trim())
      .filter((l) => l.includes(" - "));

    return new Response(JSON.stringify({ songs }));
  } catch {
    return new Response(JSON.stringify({ songs: [] }), { status: 500 });
  }
}
