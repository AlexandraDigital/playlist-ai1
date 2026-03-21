export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }

  const q = event.queryStringParameters?.q;
  if (!q) return { statusCode: 400, body: JSON.stringify({ error: 'Missing query' }) };

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: 'Missing YOUTUBE_API_KEY' }) };

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${encodeURIComponent(q)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
