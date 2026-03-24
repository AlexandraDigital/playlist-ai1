import { useState, useEffect, useRef } from "react";

export default function App() {
  const [vibe, setVibe] = useState("");
  const [playlistName, setPlaylistName] = useState("My Playlist");
  const [playlist, setPlaylist] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const dragItem = useRef();
  const dragOverItem = useRef();

  // 🔥 AUTOSAVE
  useEffect(() => {
    const saved = localStorage.getItem("playlist-app");
    if (saved) {
      const data = JSON.parse(saved);
      setPlaylists(data.playlists || []);
      setFavorites(data.favorites || []);
    }

    // 🔗 load shared playlist
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("playlist");
    if (shared) {
      try {
        const decoded = JSON.parse(atob(shared));
        setPlaylist(decoded.songs);
        setPlaylistName(decoded.name);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "playlist-app",
      JSON.stringify({ playlists, favorites })
    );
  }, [playlists, favorites]);

  // 🎧 PLAYER
  const playSong = (index) => setCurrentIndex(index);

  const nextSong = () =>
    setCurrentIndex((prev) => (prev + 1) % playlist.length);

  const prevSong = () =>
    setCurrentIndex((prev) =>
      prev === 0 ? playlist.length - 1 : prev - 1
    );

  // ❤️ FAVORITES
  const toggleFavorite = (song) => {
    setFavorites((prev) => {
      const exists = prev.find((s) => s.videoId === song.videoId);
      return exists
        ? prev.filter((s) => s.videoId !== song.videoId)
        : [...prev, song];
    });
  };

  // 🔀 DRAG REORDER
  const handleSort = () => {
    let _playlist = [...playlist];
    const draggedItem = _playlist.splice(dragItem.current, 1)[0];
    _playlist.splice(dragOverItem.current, 0, draggedItem);
    setPlaylist(_playlist);
  };

  // 🔗 SHARE
  const sharePlaylist = () => {
    const data = btoa(
      JSON.stringify({ name: playlistName, songs: playlist })
    );
    const url = `${window.location.origin}?playlist=${data}`;
    navigator.clipboard.writeText(url);
    alert("Link copied!");
  };

  // 🤖 AI
  const generateAI = async () => {
    try {
      setLoading(true);

      const res = await fetch("/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: vibe }),
      });

      const text = await res.text();
      let data = JSON.parse(text);

      const content = data?.choices?.[0]?.message?.content;
      if (!content) return alert("AI failed");

      const songs = content.split("\n");

      const cleaned = songs
        .map((s) => s.replace(/^\d+\.\s*/, "").trim())
        .filter((s) => s.includes(" - "));

      let finalSongs = [];

      for (let s of cleaned.slice(0, 10)) {
        const [artist, title] = s.split(" - ");

        const r = await fetch(
          `/search?q=${encodeURIComponent(artist + " " + title)}`
        );
        const d = await r.json();

        if (d.items?.length) {
          finalSongs.push({
            title: d.items[0].snippet.title,
            videoId: d.items[0].id.videoId,
            thumbnail: d.items[0].snippet.thumbnails.medium.url,
          });
        }
      }

      if (!finalSongs.length) return alert("No songs found");

      setPlaylist(finalSongs);
      setPlaylistName(vibe || "New Playlist");

      setPlaylists((prev) => [
        { name: vibe || "New Playlist", songs: finalSongs },
        ...prev,
      ]);
    } catch {
      alert("AI failed");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 text-center">
      <h1 className="text-4xl font-bold text-purple-400 mb-6">
        🎧 Playlist AI
      </h1>

      {/* AI INPUT */}
      <div className="flex gap-2 justify-center mb-4">
        <input
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generateAI()}
          placeholder="Type a vibe..."
          className="p-3 rounded w-80 bg-gray-800"
        />
        <button onClick={generateAI} className="bg-purple-600 px-4 rounded">
          AI
        </button>
      </div>

      {/* RENAME + SHARE */}
      <div className="flex justify-center gap-2 mb-4">
        <input
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          className="p-2 bg-gray-800 rounded"
        />
        <button onClick={sharePlaylist} className="bg-blue-600 px-3 rounded">
          🔗 Share
        </button>
      </div>

      {/* SONG LIST */}
      <div className="space-y-3 max-w-md mx-auto">
        {playlist.length === 0 && <p>No songs yet 🎧</p>}

        {playlist.map((song, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => (dragItem.current = i)}
            onDragEnter={() => (dragOverItem.current = i)}
            onDragEnd={handleSort}
            className="flex items-center gap-3 bg-gray-900 p-3 rounded cursor-move"
          >
            <img src={song.thumbnail} className="w-16 rounded" />

            <div className="flex-1 text-left">
              <p>{song.title}</p>
            </div>

            <button onClick={() => playSong(i)}>▶️</button>

            <button onClick={() => toggleFavorite(song)}>
              {favorites.find((f) => f.videoId === song.videoId)
                ? "❤️"
                : "🤍"}
            </button>
          </div>
        ))}
      </div>

      {/* PLAYER */}
      {playlist[currentIndex] && (
        <div className="mt-6">
          <iframe
            width="0"
            height="0"
            src={`https://www.youtube.com/embed/${playlist[currentIndex].videoId}?autoplay=1`}
            allow="autoplay"
          />
          <div className="flex justify-center gap-4 mt-3">
            <button onClick={prevSong}>⏮️</button>
            <button onClick={nextSong}>⏭️</button>
          </div>
        </div>
      )}

      {/* PLAYLISTS */}
      <h2 className="mt-10 text-xl">Your Playlists</h2>
      {playlists.map((p, i) => (
        <div
          key={i}
          className="bg-gray-800 p-3 mt-2 rounded cursor-pointer"
          onClick={() => {
            setPlaylist(p.songs);
            setPlaylistName(p.name);
          }}
        >
          {p.name}
        </div>
      ))}

      {/* FAVORITES */}
      <h2 className="mt-6 text-xl">Favorites ❤️</h2>
      {favorites.map((f, i) => (
        <div key={i}>{f.title}</div>
      ))}

      {loading && <p className="mt-4">Loading AI...</p>}
    </div>
  );
}
