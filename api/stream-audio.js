// api/stream-audio.js
// Streams YouTube audio directly using @distube/ytdl-core.
// No third-party Invidious/Piped instances needed — zero single-point-of-failure.

import ytdl from '@distube/ytdl-core';

export const config = { runtime: 'nodejs', maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    // Get video info first so we can set the correct Content-Type and Content-Length
    const info = await ytdl.getInfo(url);

    // Choose best audio-only format — prefer m4a (itag 140) for widest browser support
    const format =
      ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: f =>
        f.hasAudio && !f.hasVideo && f.container === 'm4a'
      }) ||
      ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

    const mimeType = format.mimeType?.split(';')[0]?.trim() || 'audio/mp4';
    const contentLength = format.contentLength;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');

    // Handle Range requests for seeking
    const range = req.headers['range'];
    if (range && contentLength) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : parseInt(contentLength) - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
      res.setHeader('Content-Length', chunkSize);

      const stream = ytdl(url, {
        format,
        range: { start, end },
      });
      stream.on('error', () => { if (!res.writableEnded) res.end(); });
      stream.pipe(res);
    } else {
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.status(200);

      const stream = ytdl(url, { format });
      stream.on('error', () => { if (!res.writableEnded) res.end(); });
      stream.pipe(res);
    }
  } catch (err) {
    console.error('stream-audio error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: `Stream failed: ${err.message}` });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}
