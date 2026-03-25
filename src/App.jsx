import { useState, useEffect, useRef } from "react";

export default function App() {
  const [vibe, setVibe] = useState("");
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");

  const [playlists, setPlaylists] = useState([
    { name: "My Playlist", songs: [] },
  ]);
  const [currentPlaylist, setCurrentPlaylist] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeat, setRepeat] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const fileInputRef = useRef();

  const active = playlists[currentPlaylist];

  // 📱 INSTALL
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () =>
      window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installApp = () => {
    if (!deferredPrompt) return alert("Install not available");
    deferredPrompt.prompt();
  };

  // 💾 LOAD
  useEffect(() => {
    const saved = localStorage.getItem("library");
    if (saved) setPlaylists(JSON.parse(saved));
  }, []);

  // 💾 SAVE
  useEffect(() => {
    localStorage.setItem("library", JSON.stringify(playlists));
  }, [playlists]);

  // ➕ ADD SONG
  const addSong = (s) => {
    const updated = [...playlists];
    updated[currentPlaylist].songs.unshift(s);
    setPlaylists(updated);
  };

  // ❌ REMOVE
  const removeSong = (i) => {
    const updated = [...playlists];
    updated[currentPlaylist].songs.splice(i, 1);
    setPlaylists(updated);
  };

  // 🔍 SEARCH
  const searchSong = async () => {
    if (!artist && !song) return;

    try {
      const q = `${artist} ${song}`;
      const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
      const d = await res.json();

      const vid = d.items?.find((v) => v.id?.videoId);
      if (!vid) return alert("No results");

      addSong({
        title: vid.snippet.title,
        videoId: vid.id.videoId,
        thumbnail: vid.snippet.thumbnails.medium.url,
      });

      setArtist("");
      setSong("");
    } catch {
      alert("Search failed");
    }
  };

  // 🤖 AI
  const generateAI = async () => {
    if (!vibe) return;

    try {
      const res = await fetch("/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: vibe }),
      });

      const data = await res.json();
      const songs = data.songs;

      if (!songs?.length) return alert("AI failed");

      let results = [];

      for (let s of songs) {
        const [a, t] = s.split(" - ");
        const r = await fetch(`/search?q=${encodeURIComponent(a + " " + t)}`);
        const d = await r.json();

        const vid = d.items?.find((v) => v.id?.videoId);

        if (vid) {
          results.push({
            title: vid.snippet.title,
            videoId: vid.id.videoId,
            thumbnail: vid.snippet.thumbnails.medium.url,
          });
        }
      }

      if (!results.length) return alert("AI worked but search failed");

      const updated = [...playlists];
      updated[currentPlaylist].songs = results;
      setPlaylists(updated);
    } catch {
      alert("AI error");
    }
  };

  // 📤 UPLOAD
  const upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    addSong({
      title: file.name,
      url: URL.createObjectURL(file),
      local: true,
    });
  };

  // 🧹 CLEAR
  const clearPlaylist = () => {
    const updated = [...playlists];
    updated[currentPlaylist].songs = [];
    setPlaylists(updated);
  };

  // ➕ NEW PLAYLIST
  const newPlaylist = () => {
    setPlaylists([...playlists, { name: "New Playlist", songs: [] }]);
    setCurrentPlaylist(playlists.length);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">

      {/* CENTER CONTAINER */}
      <div className="w-full max-w-xl">

        {/* 🎧 LOGO */}
        <div className="flex flex-col items-center mb-6 animate-bounce">
          <div className="text-5xl">🎧</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            Playlist AI
          </h1>
        </div>

        {/* HEADER CENTERED */}
        <div className="flex flex-col items-center gap-3 mb-6">

          <div className="flex gap-2">
            <button className="bg-purple-600 px-4 py-2 rounded-xl">
              {active.name}
            </button>

            <button
              onClick={newPlaylist}
              className="bg-purple-600 px-3 py-2 rounded-xl"
            >
              +
            </button>
          </div>

          <button
            onClick={installApp}
            className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-xl text-sm"
          >
            Install
          </button>
        </div>

        {/* AI */}
        <input
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generateAI()}
          placeholder="Type a vibe..."
          className="w-full p-3 mb-2 bg-gray-900 rounded-xl"
        />

        <button
          onClick={generateAI}
          className="w-full bg-purple-600 p-3 mb-4 rounded-xl"
        >
          Generate AI Playlist
        </button>

        {/* SEARCH */}
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artist"
          className="w-full p-3 mb-2 bg-gray-900 rounded-xl"
        />

        <input
          value={song}
          onChange={(e) => setSong(e.target.value)}
          placeholder="Song"
          className="w-full p-3 mb-2 bg-gray-900 rounded-xl"
        />

        <button
          onClick={searchSong}
          className="w-full bg-purple-600 p-3 mb-4 rounded-xl"
        >
          Add Song
        </button>

        {/* ACTIONS */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={clearPlaylist}
            className="bg-gray-700 hover:bg-red-400 p-3 rounded-xl"
          >
            Clear
          </button>

          <button
            onClick={() => setRepeat(!repeat)}
            className={`p-3 rounded-xl ${
              repeat ? "bg-purple-600" : "bg-gray-700"
            }`}
          >
            🔁
          </button>

          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-purple-600 p-3 rounded-xl"
          >
            Upload
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={upload}
          hidden
        />

        {/* SONG LIST */}
        {active.songs.length === 0 && (
          <p className="text-center text-gray-400">No songs yet 🎧</p>
        )}

        {active.songs.map((s, i) => (
          <div
            key={i}
            onClick={() => setCurrentIndex(i)}
            className="flex gap-3 bg-gray-900 p-3 mb-2 rounded-xl"
          >
            {s.thumbnail && (
              <img src={s.thumbnail} className="w-14 rounded" />
            )}
            <div className="flex-1 text-sm">{s.title}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeSong(i);
              }}
            >
              ❌
            </button>
          </div>
        ))}

        {/* PLAYER */}
        {active.songs[currentIndex] &&
          (active.songs[currentIndex].local ? (
            <audio
              src={active.songs[currentIndex].url}
              controls
              autoPlay
              loop={repeat}
              className="w-full mt-4"
            />
          ) : (
            <iframe
              width="0"
              height="0"
              src={`https://www.youtube.com/embed/${active.songs[currentIndex].videoId}?autoplay=1&loop=${
                repeat ? 1 : 0
              }`}
              allow="autoplay"
            />
          ))}
      </div>
    </div>
  );
}
