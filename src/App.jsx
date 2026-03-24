
import { useState, useEffect, useRef } from "react";

export default function App() {
  const [vibe, setVibe] = useState("");
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");

  const [playlist, setPlaylist] = useState([]);
  const [uploadedSongs, setUploadedSongs] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [loading, setLoading] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const dragItem = useRef();
  const dragOverItem = useRef();
  const fileInputRef = useRef();

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

  // ▶️ PLAYER
  const playSong = (i) => setCurrentIndex(i);

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

    try {
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
    } catch {
      alert("Search failed");
    }
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
      console.log("AI RAW:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        alert("AI response broken");
        return;
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) return alert("AI failed");

      const songs = content
        .split("\n")
        .map((s) => s.replace(/^\d+\.\s*/, "").trim())
        .filter((s) => s.includes(" - "));

      let results = [];

      for (let s of songs.slice(0, 10)) {
        const [artist, title] = s.split(" - ");

        try {
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
        } catch {}
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
    setPlaylist((prev) => [newSong, ...prev]);
  };

  // ❌ REMOVE
  const removeUploaded = (index) => {
    setUploadedSongs((prev) => prev.filter((_, i) => i !== index));
    setPlaylist((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl px-4">

        {/* TITLE */}
        <h1 className="text-4xl text-center font-bold mb-8 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
          🎧 Playlist AI
        </h1>

        <div className="space-y-4">

          {/* AI */}
          <input
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateAI()}
            placeholder="Type a vibe..."
            className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800"
          />

          <button
            onClick={generateAI}
            className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-700"
          >
            Generate AI Playlist
          </button>

          {/* SEARCH */}
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchSong()}
            placeholder="Artist"
            className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800"
          />

          <input
            value={song}
            onChange={(e) => setSong(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchSong()}
            placeholder="Song"
            className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800"
          />

          {/* BUTTONS */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={searchSong} className="p-3 rounded-xl bg-purple-600">Add</button>
            <button onClick={share} className="p-3 rounded-xl bg-purple-500">Share</button>
            <button onClick={() => setRepeat(!repeat)} className="p-3 rounded-xl bg-gray-800">🔁</button>
            <button onClick={installApp} className="p-3 rounded-xl bg-purple-600">Install</button>
          </div>

          {/* UPLOAD */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current.click()}
            className="w-full p-4 rounded-xl border-2 border-dashed border-purple-500 hover:bg-purple-500/10"
          >
            📤 Upload Music
          </button>
        </div>

        {/* PLAYLIST */}
        <div className="mt-6 space-y-3">
          {playlist.map((s, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => (dragItem.current = i)}
              onDragEnter={() => (dragOverItem.current = i)}
              onDragEnd={handleSort}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center gap-3 bg-gray-900 p-3 rounded-xl"
            >
              {s.thumbnail && (
                <img src={s.thumbnail} className="w-14 rounded" />
              )}

              <div className="flex-1 text-sm">{s.title}</div>

              <button onClick={() => playSong(i)}>▶️</button>
              <button onClick={() => toggleFavorite(s)}>❤️</button>

              {s.local && (
                <button
                  onClick={() => removeUploaded(i)}
                  className="text-red-400"
                >
                  ✖
                </button>
              )}
            </div>
          ))}
        </div>

        {/* PLAYER */}
        {playlist[currentIndex] &&
          (playlist[currentIndex].local ? (
            <audio
              className="w-full mt-6"
              src={playlist[currentIndex].url}
              controls
              autoPlay
            />
          ) : (
            <iframe
              width="0"
              height="0"
              src={`https://www.youtube.com/embed/${playlist[currentIndex].videoId}?autoplay=1`}
              allow="autoplay"
            />
          ))}
      </div>
    </div>
  );
}
