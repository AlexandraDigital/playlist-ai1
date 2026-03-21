import { getStore } from '@netlify/blobs';

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const store = getStore({ name: 'playlists', consistency: 'strong' });

  // GET: load playlists by sync code
  if (event.httpMethod === 'GET') {
    const code = event.queryStringParameters?.code;
    if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing code' }) };

    try {
      const data = await store.get(code, { type: 'json' });
      if (!data) return { statusCode: 404, headers, body: JSON.stringify({ error: 'No playlists found for this code' }) };
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    } catch {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
    }
  }

  // POST: save playlists by sync code
  if (event.httpMethod === 'POST') {
    try {
      const { code, playlists } = JSON.parse(event.body);
      if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing code' }) };

      await store.setJSON(code, { playlists, updatedAt: new Date().toISOString() });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
