export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const videoId = event.queryStringParameters?.videoId;
  if (!videoId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoId' }) };

  // Try multiple cobalt instances in order
  const instances = [
    'https://cobalt.tools/api',
    'https://co.wuk.sh/api/json',
    'https://cobalt.imput.net/api/json',
  ];

  let lastError = 'All download sources failed';

  for (const instanceBase of instances) {
    try {
      const endpoint = instanceBase.endsWith('/json') ? instanceBase : `${instanceBase}/json`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          downloadMode: 'audio',
          audioFormat: 'mp3',
          // legacy fields for older instances
          isAudioOnly: true,
          aFormat: 'mp3',
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const data = await res.json();

      if (data.url) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ url: data.url }),
        };
      }

      lastError = data.text || data.error || 'No URL in response';
    } catch (e) {
      lastError = e.message;
    }
  }

  return { statusCode: 500, body: JSON.stringify({ error: lastError }) };
};
