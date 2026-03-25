import { useState, useEffect, useRef } from "react";

export default function App() {
  const [vibe, setVibe] = useState("");
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState([{ name: "My Playlist", songs: [] }]);
  const [currentPlaylist, setCurrentPlaylist] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const fileInputRef = useRef();
  const renameInputRef = useRef();
  const active = playlists[currentPlaylist];

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installApp = () => { if (!deferredPrompt) return; deferredPrompt.prompt(); };

  const upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    addSong({ title: file.name, url: URL.createObjectURL(file), source: "local" });
  };

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("library");
      const savedState = localStorage.getItem("playerState");
      if (saved) setPlaylists(JSON.parse(saved));
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.currentPlaylist !== undefined) setCurrentPlaylist(state.currentPlaylist);
        if (state.currentIndex !== undefined) setCurrentIndex(state.currentIndex);
      }
    } catch {
      localStorage.removeItem("library");
      localStorage.removeItem("playerState");
    }
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    localStorage.setItem("library", JSON.stringify(playlists));
    localStorage.setItem("playerState", JSON.stringify({ currentPlaylist, currentIndex }));
  }, [playlists, currentPlaylist, currentIndex]);

  const addSong = (s) => {
    const updated = [...playlists];
    updated[currentPlaylist].songs.unshift(s);
    setPlaylists(updated);
  };

  const removeSong = (i) => {
    const updated = [...playlists];
    updated[currentPlaylist].songs.splice(i, 1);
    setPlaylists(updated);
    setCurrentIndex((prev) => Math.min(prev, Math.max(0, updated[currentPlaylist].songs.length - 1)));
  };

  const newPlaylist = () => {
    const name = prompt("Name your playlist:") || "New Playlist";
    const updated = [...playlists, { name, songs: [] }];
    setPlaylists(updated);
    setCurrentPlaylist(updated.length - 1);
    setCurrentIndex(0);
  };

  const deletePlaylist = () => {
    if (playlists.length === 1) return alert("Can't delete the last playlist");
    const updated = playlists.filter((_, i) => i !== currentPlaylist);
    setPlaylists(updated);
    setCurrentPlaylist(0);
    setCurrentIndex(0);
  };

  const startRename = () => {
    setRenameValue(active.name);
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const confirmRename = () => {
    if (renameValue.trim()) {
      const updated = [...playlists];
      updated[currentPlaylist].name = renameValue.trim();
      setPlaylists(updated);
    }
    setIsRenaming(false);
  };

  // Drag & drop
  const handleDragStart = (i) => setDragIndex(i);
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIndex(i); };
  const handleDrop = (i) => {
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); setDragOverIndex(null); return; }
    const updated = [...playlists];
    const songs = [...updated[currentPlaylist].songs];
    const [moved] = songs.splice(dragIndex, 1);
    songs.splice(i, 0, moved);
    updated[currentPlaylist].songs = songs;
    setPlaylists(updated);
    if (currentIndex === dragIndex) setCurrentIndex(i);
    else if (currentIndex > dragIndex && currentIndex <= i) setCurrentIndex(currentIndex - 1);
    else if (currentIndex < dragIndex && currentIndex >= i) setCurrentIndex(currentIndex + 1);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const safeFetchJSON = async (url, options) => {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`The ${url} endpoint returned an HTML page. Make sure Cloudflare Pages functions are deployed and GROQ_API_KEY is set.`);
    }
    return res.json();
  };

  const trySpotify = async (query) => {
    try {
      const res = await fetch(`/spotify?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.track) return { title: data.track.title, spotifyEmbedUrl: data.track.embedUrl, source: "spotify" };
    } catch {}
    return null;
  };

  const searchSong = async () => {
    if (!artist && !song) return;
    try {
      const q = `${artist} ${song}`;
      const data = await safeFetchJSON(`/search?q=${encodeURIComponent(q)}`);
      const vid = data.items?.[0];
      if (vid) {
        addSong({
          title: vid.snippet.title,
          videoId: vid.id.videoId,
          thumbnail: `https://img.youtube.com/vi/${vid.id.videoId}/mqdefault.jpg`,
          source: "youtube",
        });
      } else {
        const spotifyTrack = await trySpotify(q);
        if (spotifyTrack) addSong(spotifyTrack);
        else { alert("No results found on YouTube or Spotify"); return; }
      }
      setArtist(""); setSong("");
    } catch (e) { alert("Search failed: " + e.message); }
  };

  const generateAI = async () => {
    if (!vibe) return;
    setLoading(true);
    try {
      const data = await safeFetchJSON("/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: vibe }),
      });
      const songs = data.songs;
      if (!songs?.length) {
        alert(data.error || "AI returned no songs — make sure GROQ_API_KEY is set in Cloudflare Pages → Settings → Environment Variables");
        setLoading(false);
        return;
      }
      const results = [];
      for (const s of songs) {
        try {
          const d = await safeFetchJSON(`/search?q=${encodeURIComponent(s)}`);
          const vid = d.items?.[0];
          if (vid) {
            results.push({
              title: vid.snippet.title,
              videoId: vid.id.videoId,
              thumbnail: `https://img.youtube.com/vi/${vid.id.videoId}/mqdefault.jpg`,
              source: "youtube",
            });
            continue;
          }
        } catch {}
        const spotifyTrack = await trySpotify(s);
        if (spotifyTrack) results.push(spotifyTrack);
      }
      if (!results.length) { alert("Couldn't find any songs. Check your API keys."); setLoading(false); return; }
      const updated = [...playlists];
      updated[currentPlaylist].songs = results;
      setPlaylists(updated);
      setCurrentIndex(0);
    } catch (e) {
      alert("AI error: " + (e.message || "Unknown error"));
    }
    setLoading(false);
  };

  const clearPlaylist = () => {
    const updated = [...playlists];
    updated[currentPlaylist].songs = [];
    setPlaylists(updated);
    setCurrentIndex(0);
  };

  const nextSong = () => { if (!active.songs.length) return; setCurrentIndex((prev) => (prev + 1) % active.songs.length); };
  const prevSong = () => { if (!active.songs.length) return; setCurrentIndex((prev) => (prev - 1 + active.songs.length) % active.songs.length); };

  const currentSong = active.songs[currentIndex];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 py-5 border-b border-gray-900">
        <span className="text-3xl">🎧</span>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
          Playlist AI
        </h1>
      </div>

      {/* Main two-column layout */}
      <div className="flex flex-1 gap-4 p-4 max-w-6xl mx-auto w-full flex-col lg:flex-row">

        {/* ── LEFT COLUMN: Controls + Player ── */}
        <div className="flex flex-col gap-3 lg:w-80 shrink-0">

          {/* AI Generate card */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">✨ AI Generate</p>
            <input
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateAI()}
              placeholder="Type a vibe, mood or genre…"
              className="w-full p-3 mb-2 bg-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              onClick={generateAI}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-800 p-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
            >
              {loading ? "⏳ Generating…" : "⚡ Generate AI Playlist"}
            </button>
          </div>

          {/* Add Song card */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">🔍 Add Song</p>
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist"
              className="w-full p-3 mb-2 bg-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
            />
            <input
              value={song}
              onChange={(e) => setSong(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchSong()}
              placeholder="Song title"
              className="w-full p-3 mb-2 bg-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
            />
            <div className="flex gap-2">
              <button
                onClick={searchSong}
                className="flex-1 bg-purple-600 hover:bg-purple-500 p-3 rounded-xl font-semibold text-sm transition"
              >
                Add Song
              </button>
              <button
                onClick={() => fileInputRef.current.click()}
                className="bg-gray-700 hover:bg-gray-600 px-4 rounded-xl text-lg transition"
                title="Upload local file"
              >
                📁
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={upload} hidden />
          </div>

          {/* Now Playing card */}
          {currentSong && (
            <div className="bg-gray-900 rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">🎵 Now Playing</p>

              {/* Thumbnail hero for YouTube */}
              {currentSong.source === "youtube" && currentSong.videoId && (
                <div className="relative w-full mb-3 rounded-xl overflow-hidden">
                  <img
                    src={`https://img.youtube.com/vi/${currentSong.videoId}/mqdefault.jpg`}
                    alt=""
                    className="w-full object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-xl" />
                  <p className="absolute bottom-2 left-2 right-2 text-xs font-medium truncate">{currentSong.title}</p>
                </div>
              )}

              {currentSong.source !== "youtube" && (
                <p className="text-sm font-medium truncate mb-2">{currentSong.title}</p>
              )}

              {/* Prev / Repeat / Next */}
              <div className="flex justify-center gap-3 mb-3">
                <button onClick={prevSong} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl transition">⏮</button>
                <button
                  onClick={() => setRepeat(!repeat)}
                  className={`px-4 py-2 rounded-xl transition ${repeat ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"}`}
                  title="Toggle repeat"
                >🔁</button>
                <button onClick={nextSong} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl transition">⏭</button>
              </div>

              {/* Player embed */}
              {currentSong.source === "local" ? (
                <audio src={currentSong.url} controls autoPlay loop={repeat} className="w-full" />
              ) : currentSong.source === "spotify" ? (
                <iframe
                  className="w-full rounded-xl"
                  height="152"
                  src={currentSong.spotifyEmbedUrl}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              ) : (
                <iframe
                  className="w-full rounded-xl"
                  height="200"
                  src={`https://www.youtube.com/embed/${currentSong.videoId}?autoplay=1&loop=${repeat ? 1 : 0}&playlist=${currentSong.videoId}`}
                  allow="autoplay"
                />
              )}
            </div>
          )}

          {/* Utility row */}
          <div className="flex gap-2">
            <button onClick={clearPlaylist} className="flex-1 bg-gray-800 hover:bg-gray-700 p-2 rounded-xl text-sm transition">
              🗑 Clear
            </button>
            {deferredPrompt && (
              <button onClick={installApp} className="flex-1 bg-purple-700 hover:bg-purple-600 p-2 rounded-xl text-sm transition">
                📲 Install
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Playlist panel ── */}
        <div className="flex flex-col flex-1 bg-gray-900 rounded-2xl overflow-hidden min-h-[400px]">

          {/* Playlist header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={confirmRename}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setIsRenaming(false); }}
                  className="flex-1 bg-gray-800 px-3 py-1 rounded-lg text-lg font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <h2 className="flex-1 text-lg font-bold truncate">{active.name}</h2>
              )}
              <button
                onClick={startRename}
                className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg text-sm transition"
                title="Rename playlist"
              >✏️</button>
              <button
                onClick={newPlaylist}
                className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg text-sm font-bold transition"
                title="New playlist"
              >+</button>
              <button
                onClick={deletePlaylist}
                className="bg-gray-700 hover:bg-red-900 px-3 py-1 rounded-lg text-sm transition"
                title="Delete playlist"
              >🗑</button>
            </div>

            {/* Playlist tabs */}
            {playlists.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {playlists.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentPlaylist(i); setCurrentIndex(0); }}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition ${
                      i === currentPlaylist
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Song list — drag & drop */}
          <div className="flex-1 overflow-y-auto p-3">
            {active.songs.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-600">
                <div className="text-5xl mb-3">🎵</div>
                <p className="text-sm">No songs yet — generate or add some!</p>
              </div>
            )}

            {active.songs.map((s, i) => (
              <div
                key={`${s.videoId || s.spotifyEmbedUrl || s.url || s.title}-${i}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                onClick={() => setCurrentIndex(i)}
                className={`flex items-center gap-3 p-2 mb-1 rounded-xl cursor-pointer transition-all select-none ${
                  i === currentIndex
                    ? "bg-purple-900 border border-purple-500"
                    : dragOverIndex === i
                    ? "bg-gray-700 border border-dashed border-purple-400"
                    : "bg-gray-800 hover:bg-gray-700"
                } ${dragIndex === i ? "opacity-30" : ""}`}
              >
                {/* Thumbnail / cover art */}
                {s.source === "youtube" && s.videoId ? (
                  <img
                    src={s.thumbnail || `https://img.youtube.com/vi/${s.videoId}/mqdefault.jpg`}
                    alt=""
                    className="w-14 h-10 object-cover rounded-lg shrink-0"
                    draggable={false}
                  />
                ) : s.source === "spotify" ? (
                  <div className="w-14 h-10 bg-[#1db954]/20 border border-[#1db954]/30 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-[#1db954] text-lg">♫</span>
                  </div>
                ) : (
                  <div className="w-14 h-10 bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-gray-400">📁</span>
                  </div>
                )}

                {/* Title + source */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{s.title}</p>
                  <p className={`text-xs mt-0.5 capitalize ${
                    s.source === "youtube" ? "text-red-400" :
                    s.source === "spotify" ? "text-green-400" : "text-blue-400"
                  }`}>{s.source}</p>
                </div>

                {/* Playing indicator */}
                {i === currentIndex && (
                  <span className="text-purple-400 text-xs shrink-0">▶</span>
                )}

                {/* Drag handle */}
                <span className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing shrink-0 text-lg px-1" title="Drag to reorder">
                  ⠿
                </span>

                {/* Remove */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeSong(i); }}
                  className="text-gray-600 hover:text-red-400 shrink-0 transition"
                  title="Remove song"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-600">
              {active.songs.length} song{active.songs.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
              Autosaved
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
