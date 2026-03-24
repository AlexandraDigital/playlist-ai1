import { useState, useEffect, useRef } from "react";

export default function App() {
  const [vibe, setVibe] = useState("");
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");

  const [playlist, setPlaylist] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [uploadedSongs, setUploadedSongs] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const [playlistName, setPlaylistName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [repeat, setRepeat] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const dragItem = useRef();
  const dragOverItem = useRef();

  // 📱 INSTALL
  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const installApp = () => {
    if (!deferredPrompt) return alert("Install not available");
    deferredPrompt.prompt();
  };

  // 💾 AUTOSAVE
  useEffect(() => {
    const saved = localStorage.getItem("playlist-ai");
    if (saved) {
      const data = JSON.parse(saved);
      setPlaylists(data.playlists || []);
      setFavorites(data.favorites || []);
      setUploadedSongs(data.uploaded || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "playlist-ai",
      JSON.stringify({ playlists, favorites, uploaded: uploadedSongs })
    );
  }, [playlists, favorites, uploadedSongs]);

  // ▶️ PLAYER
  const playSong = (i) => setCurrentIndex(i);

  const nextSong = () => {
    if (repeat) return;
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  };

  const prevSong = () => {
    if (repeat) return;
    setCurrentIndex((prev) =>
      prev === 0 ? playlist.length - 1 : prev - 1
    );
  };

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

  // 📤 UPLOAD
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const newSong = {
      title: file.name,
      url: URL.createObjectURL(file),
      local: true,
    };

    setUploadedSongs((prev) => [newSong, ...prev]);
  };

  // 💾 SAVE PLAYLIST
  const savePlaylist = () => {
    if (!playlist.length) return alert("No songs");
    setPlaylists((prev) => [
      { name: playlistName || "My Playlist", songs: playlist },
      ...prev,
    ]);
  };

  // 🧹 CLEAR
  const clearAll = () => {
    setPlaylist([]);
    setVibe("");
    setArtist("");
    setSong("");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-3xl mx-auto">
      <h1 className="text-4xl text-center font-bold mb-6 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
        🎧 Playlist AI
      </h1>

      {/* AI */}
      <div className="flex gap-2 mb-4">
        <input
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generateAI()}
          placeholder="Type a vibe..."
          className="flex-1 p-3 rounded-xl bg-gray-900 border border-gray-800 focus:border-purple-500 outline-none"
        />
        <button
          onClick={generateAI}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 transition shadow-lg shadow-purple-900/30"
        >
          AI
        </button>
      </div>

      {/* SEARCH */}
      <div className="flex gap-2 mb-4">
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchSong()}
          placeholder="Artist"
          className="flex-1 p-3 rounded-xl bg-gray-900 border border-gray-800 focus:border-purple-500"
        />
        <input
          value={song}
          onChange={(e) => setSong(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchSong()}
          placeholder="Song"
          className="flex-1 p-3 rounded-xl bg-gray-900 border border-gray-800 focus:border-purple-500"
        />
      </div>

      {/* BUTTONS */}
      <div className="flex flex-wrap gap-3 justify-center mb-4">
        <button onClick={searchSong} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500">
          Add Song
        </button>

        <button onClick={savePlaylist} className="px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-700">
          Save 💾
        </button>

        <button onClick={share} className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700">
          Share 🔗
        </button>

        <button onClick={clearAll} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500">
          Clear ❌
        </button>

        <button onClick={installApp} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">
          Install 📱
        </button>

        <button
          onClick={() => setPlaylist(uploadedSongs)}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600"
        >
          Uploaded 🎵
        </button>

        <button
          onClick={() => setRepeat(!repeat)}
          className={`px-4 py-2 rounded-xl ${
            repeat
              ? "bg-purple-600 shadow-lg shadow-purple-900/40"
              : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          🔁
        </button>

        <input type="file" accept="audio/*" onChange={handleUpload} />
      </div>

      {/* PLAYLIST NAME */}
      <input
        value={playlistName}
        onChange={(e) => setPlaylistName(e.target.value)}
        placeholder="Playlist name..."
        className="w-full p-2 mb-4 rounded-xl bg-gray-900 border border-gray-800"
      />

      {/* SONG LIST */}
      <div className="space-y-3">
        {playlist.map((s, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => (dragItem.current = i)}
            onDragEnter={() => (dragOverItem.current = i)}
            onDragEnd={handleSort}
            onDragOver={(e) => e.preventDefault()}
            className="flex items-center gap-3 bg-gray-900/80 p-3 rounded-xl hover:bg-gray-800 transition cursor-move border border-gray-800"
          >
            {s.thumbnail && <img src={s.thumbnail} className="w-16 rounded" />}

            <div className="flex-1">{s.title}</div>

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
      {playlist[currentIndex] &&
        (playlist[currentIndex].local ? (
          <audio src={playlist[currentIndex].url} controls autoPlay />
        ) : (
          <iframe
            width="0"
            height="0"
            src={`https://www.youtube.com/embed/${playlist[currentIndex].videoId}?autoplay=1`}
            allow="autoplay"
          />
        ))}

      {/* SAVED */}
      <h2 className="mt-8">Your Playlists</h2>
      {playlists.map((p, i) => (
        <div
          key={i}
          onClick={() => setPlaylist(p.songs)}
          className="bg-gray-800 p-2 mt-2 rounded cursor-pointer"
        >
          {p.name}
        </div>
      ))}

      {loading && <p className="mt-4">Loading AI...</p>}
    </div>
  );
}
