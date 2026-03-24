import { useState, useRef, useEffect } from "react";

/* ---------- IndexedDB ---------- */
const openDB = () =>
  new Promise((resolve) => {
    const req = indexedDB.open("musicDB", 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("playlists", { keyPath: "id" });
    };

    req.onsuccess = () => resolve(req.result);
  });

export default function App() {
  const [query, setQuery] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [manualSong, setManualSong] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [playlists, setPlaylists] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const audioRef = useRef(null);

  const currentPlaylist = playlists[currentIndex]?.songs || [];

  /* ---------- LOAD DB ---------- */
  useEffect(() => {
    (async () => {
      const db = await openDB();
      const tx = db.transaction("playlists", "readonly");
      const store = tx.objectStore("playlists");

      const req = store.getAll();
      req.onsuccess = () => {
        if (req.result.length) setPlaylists(req.result);
      };
    })();
  }, []);

  /* ---------- SAVE DB ---------- */
  useEffect(() => {
    (async () => {
      const db = await openDB();
      const tx = db.transaction("playlists", "readwrite");
      const store = tx.objectStore("playlists");

      playlists.forEach((p) => store.put(p));
    })();
  }, [playlists]);

  /* ---------- PLAY ---------- */
  const play = (track) => {
    if (audioRef.current) audioRef.current.pause();

    if (track.file) {
      audioRef.current = new Audio(URL.createObjectURL(track.file));
      audioRef.current.play();
    } else if (track.videoId) {
      window.open(
        `https://www.youtube.com/watch?v=${track.videoId}`,
        "_blank"
      );
    }
  };

  /* ---------- AI ---------- */
  const generateAI = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      const text = data.choices[0].message.content;

      const songs = text
        .split("\n")
        .map((s) => s.replace(/^\d+[\.\-\)]?\s*/, "").trim())
        .filter((s) => s.length > 2)
        .slice(0, 10);

      const results = [];

      for (let song of songs) {
        const r = await fetch(`/api/search?q=${encodeURIComponent(song)}`);
        const d = await r.json();

        if (d?.videoId) {
          results.push({
            id: Date.now() + Math.random(),
            title: d.title,
            videoId: d.videoId,
            thumbnail: d.thumbnail,
          });
        }
      }

      const newPlaylist = {
        id: Date.now(),
        name:
          playlistName ||
          (query
            ? query.charAt(0).toUpperCase() + query.slice(1)
            : "New Playlist"),
        songs: results,
      };

      setPlaylists((prev) => [newPlaylist, ...prev]);
      setCurrentIndex(0);

      setPlaylistName(""); // clear
    } catch {
      alert("AI failed");
    }

    setLoading(false);
  };

  /* ---------- SEARCH ---------- */
  const handleSearch = async (value) => {
    setManualSong(value);

    if (!value) return setSearchResults([]);

    const r = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
    const d = await r.json();

    if (d?.videoId) setSearchResults([d]);
  };

  /* ---------- ADD SONG ---------- */
  const addSong = (d) => {
    const track = {
      id: Date.now(),
      title: d.title,
      videoId: d.videoId,
      thumbnail: d.thumbnail,
    };

    setPlaylists((prev) => {
      const updated = [...prev];

      if (!updated[currentIndex]) {
        return [
          {
            id: Date.now(),
            name: "My Playlist",
            songs: [track],
          },
        ];
      }

      updated[currentIndex].songs.unshift(track);
      return updated;
    });

    setManualSong("");
    setSearchResults([]);
  };

  /* ---------- UPLOAD ---------- */
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const track = {
      id: Date.now(),
      title: file.name,
      file,
    };

    setPlaylists((prev) => {
      const updated = [...prev];

      if (!updated[currentIndex]) {
        return [
          {
            id: Date.now(),
            name: "My Music",
            songs: [track],
          },
        ];
      }

      updated[currentIndex].songs.unshift(track);
      return updated;
    });
  };

  /* ---------- RENAME ---------- */
  const renamePlaylist = () => {
    const name = prompt("New playlist name:");
    if (!name) return;

    setPlaylists((prev) => {
      const updated = [...prev];
      updated[currentIndex].name = name;
      return updated;
    });
  };

  /* ---------- INSTALL ---------- */
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () =>
      window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white flex flex-col items-center p-6">

      {/* Title */}
      <h1 className="text-4xl font-bold mb-8 text-purple-400 drop-shadow-lg">
        🎧 Playlist AI
      </h1>

      {/* Playlist Name */}
      <input
        value={playlistName}
        onChange={(e) => setPlaylistName(e.target.value)}
        placeholder="Playlist name..."
        className="w-full max-w-md mb-3 bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl outline-none focus:border-purple-500"
      />

      {/* AI Input */}
      <div className="w-full max-w-md flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a vibe..."
          className="flex-1 bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl outline-none focus:border-purple-500"
        />
        <button
          onClick={generateAI}
          className="bg-purple-600 hover:bg-purple-700 px-4 rounded-xl"
        >
          {loading ? "..." : "AI"}
        </button>
      </div>

      {/* Search Add */}
      <div className="w-full max-w-md mb-4">
        <input
          value={manualSong}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search & add song..."
          className="w-full bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl outline-none focus:border-green-500"
        />

        {searchResults.map((r) => (
          <div
            key={r.videoId}
            onClick={() => addSong(r)}
            className="bg-zinc-800 hover:bg-zinc-700 p-3 rounded-xl mt-2 cursor-pointer text-sm"
          >
            {r.title}
          </div>
        ))}
      </div>

      {/* Upload */}
      <label className="mb-6 cursor-pointer bg-purple-600 hover:bg-purple-700 px-5 py-2 rounded-xl shadow-lg transition">
        Upload Music 🎵
        <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
      </label>

      {/* Playlist Selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto max-w-md w-full">
        {playlists.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setCurrentIndex(i)}
            className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap ${
              i === currentIndex ? "bg-purple-600" : "bg-zinc-800"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Rename */}
      {playlists.length > 0 && (
        <button
          onClick={renamePlaylist}
          className="mb-4 text-purple-400 text-sm hover:underline"
        >
          Rename Playlist ✏️
        </button>
      )}

      {/* Songs */}
      <div className="w-full max-w-md flex flex-col gap-3">
        {currentPlaylist.map((t) => (
          <div
            key={t.id}
            className="bg-zinc-900/80 backdrop-blur border border-zinc-800 hover:border-purple-500 transition p-4 rounded-xl flex items-center gap-3 shadow-md"
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
              className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-lg"
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

      {/* Install */}
      {deferredPrompt && (
        <button
          onClick={installApp}
          className="mt-6 bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl shadow-lg"
        >
          Install App 📱
        </button>
      )}
    </div>
  );
}
