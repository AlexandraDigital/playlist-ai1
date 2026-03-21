// api/download-audio.js
// Downloads a YouTube track as audio using @distube/ytdl-core.
// Sets Content-Disposition so the browser saves it as a file.

import ytdl from '@distube/ytdl-core';

export const config = { runtime: 'nodejs', maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId, title } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  // Sanitize filename
  const filename = (title || videoId).replace(/[^a-zA-Z0-9 _\-]/g, '').trim() || videoId;

  try {
    const info = await ytdl.getInfo(url);

    const format =
      ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: f =>
        f.hasAudio && !f.hasVideo && f.container === 'm4a'
      }) ||
      ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

    const mimeType = format.mimeType?.split(';')[0]?.trim() || 'audio/mp4';
    const ext = mimeType.includes('webm') ? 'webm' : 'm4a';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${ext}"`);
    res.setHeader('Cache-Control', 'no-store');
    if (format.contentLength) res.setHeader('Content-Length', format.contentLength);

    const stream = ytdl(url, { format });
    stream.on('error', err => {
      console.error('download-audio stream error:', err.message);
      if (!res.writableEnded) res.end();
    });
    stream.pipe(res);
  } catch (err) {
    console.error('download-audio error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: `Download failed: ${err.message}` });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}
