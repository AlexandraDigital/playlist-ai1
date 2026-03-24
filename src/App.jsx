import { useState, useRef, useEffect } from "react";

export default function App() {
  const [query, setQuery] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPlaylist = playlists[currentIndex]?.songs || [];

  const [loading, setLoading] = useState(false);

  const audioRef = useRef(null);

  const play = (track) => {
    if (audioRef.current) audioRef.current.pause();

    // Uploaded file
    if (track.url) {
      audioRef.current = new Audio(track.url);

      audioRef.current.onended = () => {
        const index = currentPlaylist.findIndex(
          (t) => t.videoId === track.videoId
        );

        let nextIndex = index + 1;
        if (nextIndex >= currentPlaylist.length) nextIndex = 0;

        play(currentPlaylist[nextIndex]);
      };

      audioRef.current.play();
    } 
    // YouTube
    else if (track.videoId) {
      window.open(
        `https://www.youtube.com/watch?v=${track.videoId}`,
        "_blank"
      );
    }
  };

  const generateAI = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({ query }),
      });

      const raw = await res.text();
      let data = JSON.parse(raw);

      const text = data.choices[0].message.content;

      const songs = text
        .split("\n")
        .map(s => s.replace(/^\d+[\.\-\)]?\s*/, "").trim())
        .filter(s => s.length > 2)
        .slice(0, 10);

      const results = [];

      for (let song of songs) {
        try {
          const r = await fetch(`/api/search?q=${encodeURIComponent(song)}`);
          const d = await r.json();

          if (d && d.videoId) {
            results.push({
              title: d.title,
              videoId: d.videoId,
              thumbnail: d.thumbnail,
            });
          }
        } catch {}
      }

      if (results.length === 0) {
        results.push({
          title: "No songs found",
          videoId: "test",
        });
      }

      // ✅ MULTI PLAYLIST
      setPlaylists((prev) => [
        {
          name: query || "New Playlist",
          songs: results,
        },
        ...prev,
      ]);

      setCurrentIndex(0);

    } catch (e) {
      console.error(e);
      alert("AI failed");
    }

    setLoading(false);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const track = {
      title: file.name,
      videoId: "local-" + Date.now(),
      url: URL.createObjectURL(file),
    };

    setPlaylists((prev) => {
      const updated = [...prev];

      if (!updated[currentIndex]) {
        return [
          {
            name: "My Music",
            songs: [track],
          },
        ];
      }

      updated[currentIndex].songs.unshift(track);
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white flex flex-col items-center p-6">
      
      <h1 className="text-4xl font-bold mb-8 text-purple-400">
        🎧 Playlist AI
      </h1>

      {/* Input */}
      <div className="w-full max-w-md flex gap-2 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a vibe..."
          className="flex-1 bg-zinc-900 p-3 rounded-xl"
        />

        <button
          onClick={generateAI}
          className="bg-purple-600 px-4 rounded-xl"
        >
          {loading ? "..." : "AI"}
        </button>
      </div>

      {/* Upload */}
      <label className="mb-6 cursor-pointer bg-purple-600 px-4 py-2 rounded-xl">
        Upload Music 🎵
        <input
          type="file"
          accept="audio/*"
          onChange={handleUpload}
          className="hidden"
        />
      </label>

      {/* Playlist selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {playlists.map((p, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`px-3 py-1 rounded-lg text-sm ${
              i === currentIndex
                ? "bg-purple-600"
                : "bg-zinc-800"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Songs */}
      <div className="w-full max-w-md flex flex-col gap-3">
        {currentPlaylist.map((t, i) => (
          <div
            key={i}
            className="bg-zinc-900 p-4 rounded-xl flex items-center gap-3"
          >
            {t.thumbnail && (
              <img src={t.thumbnail} className="w-12 h-12 rounded" />
            )}

            <div className="flex flex-col flex-1">
              <span className="text-sm font-semibold truncate">
                {t.title}
              </span>
              <span className="text-xs text-zinc-400">
                Tap to play
              </span>
            </div>

            <button
              onClick={() => play(t)}
              className="bg-purple-600 px-3 py-1 rounded-lg"
            >
              ▶
            </button>
          </div>
        ))}

        {currentPlaylist.length === 0 && (
          <div className="text-zinc-400 text-center mt-4">
            No songs yet 🎧
          </div>
        )}
      </div>
    </div>
  );
}
