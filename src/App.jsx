
import { useState, useEffect, useRef } from "react";

export default function App() {
  const [vibe, setVibe] = useState("");
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");
  const [playlist, setPlaylist] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const dragItem = useRef();
  const dragOverItem = useRef();

  // 📱 INSTALL LOGIC
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return alert("Install not available");
    deferredPrompt.prompt();
    setDeferredPrompt(null);
  };

  // 💾 AUTOSAVE
  useEffect(() => {
    const saved = localStorage.getItem("playlist-ai");
    if (saved) {
      const data = JSON.parse(saved);
      setPlaylist(data.playlist || []);
      setFavorites(data.favorites || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "playlist-ai",
      JSON.stringify({ playlist, favorites })
    );
  }, [playlist, favorites]);

  // ▶️ PLAYER
  const playSong = (i) => setCurrentIndex(i);
  const nextSong = () =>
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  const prevSong = () =>
    setCurrentIndex((prev) =>
      prev === 0 ? playlist.length - 1 : prev - 1
    );

  // ❤️ FAVORITES
  const toggleFavorite = (s) => {
    setFavorites((prev) => {
      const exists = prev.find((x) => x.videoId === s.videoId);
      return exists
        ? prev.filter((x) => x.videoId !== s.videoId)
        : [...prev, s];
    });
  };

  // 🔀 DRAG
  const handleSort = () => {
    let _list = [...playlist];
    const dragged = _list.splice(dragItem.current, 1)[0];
    _list.splice(dragOverItem.current, 0, dragged);
    setPlaylist(_list);
  };

  // 🔗 SHARE
  const share = () => {
    const data = btoa(JSON.stringify(playlist));
    const url = `${window.location.origin}?p=${data}`;
    navigator.clipboard.writeText(url);
    alert("Link copied!");
  };

  // 🔍 SEARCH
  const searchSong = async () => {
    if (!artist && !song) return;

    const query = `${artist} ${song}`;
    const r = await fetch(`/search?q=${encodeURIComponent(query)}`);
    const d = await r.json();

    if (!d.items?.length) return alert("No results");

    const vid = d.items[0];

    const newSong = {
      title: vid.snippet.title,
      videoId: vid.id.videoId,
      thumbnail: vid.snippet.thumbnails.medium.url,
    };

    setPlaylist((prev) => [newSong, ...prev]);
    setArtist("");
    setSong("");
  };

  // 🤖 AI
  const generateAI = async () => {
    if (!vibe) return;

    try {
      setLoading(true);

      const res = await fetch("/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: vibe }),
      });

      const text = await res.text();
      const data = JSON.parse(text);

      const content = data?.choices?.[0]?.message?.content;
      if (!content) return alert("AI failed");

      const songs = content
        .split("\n")
        .map((s) => s.replace(/^\d+\.\s*/, "").trim())
        .filter((s) => s.includes(" - "));

      let results = [];

      for (let s of songs.slice(0, 10)) {
        const [artist, title] = s.split(" - ");

        const r = await fetch(
          `/search?q=${encodeURIComponent(artist + " " + title)}`
        );
        const d = await r.json();

        if (d.items?.length) {
          results.push({
            title: d.items[0].snippet.title,
            videoId: d.items[0].id.videoId,
            thumbnail: d.items[0].snippet.thumbnails.medium.url,
          });
        }
      }

      if (!results.length) return alert("No songs found");

      setPlaylist(results);
    } catch {
      alert("AI failed");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-4xl text-center font-bold text-purple-400 mb-6">
        🎧 Playlist AI
      </h1>

      {/* AI INPUT */}
      <div className="flex gap-2 mb-4">
        <input
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generateAI()}
          placeholder="Type a vibe..."
          className="flex-1 p-3 rounded bg-gray-800"
        />
        <button
          onClick={generateAI}
          className="bg-purple-600 px-4 rounded"
        >
          AI
        </button>
      </div>

      {/* SEARCH */}
      <div className="flex gap-2 mb-4">
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist"
          className="flex-1 p-3 rounded bg-gray-800"
        />
        <input
          value={song}
          onChange={(e) => setSong(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchSong()}
          placeholder="Song"
          className="flex-1 p-3 rounded bg-gray-800"
        />
      </div>

      {/* BUTTONS */}
      <div className="flex gap-3 mb-6 justify-center">
        <button onClick={searchSong} className="bg-purple-600 px-4 py-2 rounded">
          Add Song
        </button>

        <button onClick={share} className="bg-blue-600 px-4 py-2 rounded">
          Share 🔗
        </button>

        <button onClick={installApp} className="bg-green-600 px-4 py-2 rounded">
          Install App 📱
        </button>
      </div>

      {/* SONG LIST */}
      <div className="space-y-3">
        {playlist.map((s, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => (dragItem.current = i)}
            onDragEnter={() => (dragOverItem.current = i)}
            onDragEnd={handleSort}
            className="flex items-center gap-3 bg-gray-900 p-3 rounded"
          >
            <img src={s.thumbnail} className="w-16 rounded" />

            <div className="flex-1">
              <p>{s.title}</p>
            </div>

            <button onClick={() => playSong(i)}>▶️</button>

            <button onClick={() => toggleFavorite(s)}>
              {favorites.find((f) => f.videoId === s.videoId)
                ? "❤️"
                : "🤍"}
            </button>
          </div>
        ))}
      </div>

      {/* PLAYER */}
      {playlist[currentIndex] && (
        <iframe
          width="0"
          height="0"
          src={`https://www.youtube.com/embed/${playlist[currentIndex].videoId}?autoplay=1`}
          allow="autoplay"
        />
      )}

      {loading && <p className="text-center mt-4">Loading AI...</p>}
    </div>
  );
}
