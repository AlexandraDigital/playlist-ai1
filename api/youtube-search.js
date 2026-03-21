const https = require("https");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Missing query" });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "YouTube API key not configured" });

  const path = `/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${encodeURIComponent(q)}&key=${apiKey}`;

  const options = {
    hostname: "www.googleapis.com",
    path,
    method: "GET",
  };

  return new Promise((resolve) => {
    const apiReq = https.request(options, (apiRes) => {
      let data = "";
      apiRes.on("data", (chunk) => (data += chunk));
      apiRes.on("end", () => {
        try {
          res.status(apiRes.statusCode).json(JSON.parse(data));
        } catch {
          res.status(500).json({ error: "Failed to parse response" });
        }
        resolve();
      });
    });
    apiReq.on("error", (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });
    apiReq.end();
  });
};
