import { useState, useRef, useEffect } from "react";

export default function App() {
  const [vibe, setVibe] = useState("");
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");

  const [playlist, setPlaylist] = useState([]);
  const [playlistName, setPlaylistName] = useState("My Playlist");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeat, setRepeat] = useState(false);

  const fileInputRef = useRef();
  const dragItem = useRef();
  const dragOverItem = useRef();

  // 🎧 Bounce
  const [bounce, setBounce] = useState(true);
  useEffect(() => {
    setTimeout(() => setBounce(false), 1200);
  }, []);

  // 🔁 FETCH RETRY
  const fetchRetry = async (url, retries = 3, delay = 800) => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (retries > 0) {
          await new Promise(r => setTimeout(r, delay));
          return fetchRetry(url, retries - 1, delay * 2);
        }
        throw new Error(res.status);
      }
      return res.json();
    } catch (e) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, delay));
        return fetchRetry(url, retries - 1, delay * 2);
      }
      throw e;
    }
  };

  // ▶️ PLAY
  const playSong = (i) => setCurrentIndex(i);

  // ❌ REMOVE
  const removeSong = (i) => {
    setPlaylist(prev => prev.filter((_, idx) => idx !== i));
  };

  // 🔀 DRAG
  const handleSort = () => {
    let list = [...playlist];
    const dragged = list.splice(dragItem.current, 1)[0];
    list.splice(dragOverItem.current, 0, dragged);
    setPlaylist(list);
  };

  // 🔍 SEARCH
  const searchSong = async () => {
    if (!artist && !song) return;

    try {
      const query = `${artist} ${song}`;
      const d = await fetchRetry(`/search?q=${encodeURIComponent(query)}`);

      if (!d.items?.length) return alert("No results");

      const vid = d.items[0];

      setPlaylist(prev => [
        {
          title: vid.snippet.title,
          videoId: vid.id.videoId,
          thumbnail: vid.snippet.thumbnails.medium.url,
        },
        ...prev,
      ]);

      setArtist("");
      setSong("");
    } catch {
      alert("Search failed");
    }
  };

  // 🤖 BULLETPROOF AI
  const generateAI = async () => {
    if (!vibe) return;

    try {
      const res = await fetch("/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Give 10 songs EXACTLY like:
Artist - Song
No extra text. Vibe: ${vibe}`,
        }),
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

      let content = data?.choices?.[0]?.message?.content;
      if (!content) return alert("AI failed");

      console.log("AI CONTENT:", content);

      let songs = content
        .split("\n")
        .map(s =>
          s
            .replace(/^\d+\.\s*/, "")
            .replace(/["“”]/g, "")
            .replace(/\s*[-–—:]\s*/, " - ")
            .trim()
        )
        .filter(s => s.includes(" - "));

      if (songs.length === 0) {
        songs = content.split(",").map(s => s.trim());
      }

      let results = [];

      for (let s of songs.slice(0, 10)) {
        const [a, t] = s.split(" - ");
        if (!a || !t) continue;

        try {
          const d = await fetchRetry(
            `/search?q=${encodeURIComponent(a + " " + t)}`
          );

          if (d.items?.length) {
            results.push({
              title: d.items[0].snippet.title,
              videoId: d.items[0].id.videoId,
              thumbnail: d.items[0].snippet.thumbnails.medium.url,
            });
          }
        } catch {}
      }

      if (!results.length) return alert("Search failed — try again");

      setPlaylist(results);
    } catch {
      alert("AI failed");
    }
  };

  // 📤 UPLOAD
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPlaylist(prev => [
      {
        title: file.name,
        url: URL.createObjectURL(file),
        local: true,
      },
      ...prev,
    ]);
  };

  // 🧹 CLEAR
  const clearPlaylist = () => {
    setPlaylist([]);
    setCurrentIndex(0);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md sm:max-w-xl px-4">

        {/* HEADER */}
        <div className="flex justify-center items-center gap-3 mb-8">
          <span className={`text-4xl ${bounce ? "animate-bounce" : ""}`}>🎧</span>
          <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            Playlist AI
          </h1>
        </div>

        {/* NAME */}
        <input
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          className="w-full text-center mb-6 bg-transparent outline-none text-xl"
        />

        {/* AI */}
        <div className="flex gap-2 mb-4">
          <input
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateAI()}
            placeholder="Type a vibe..."
            className="flex-1 p-3 rounded-xl bg-gray-900 border border-gray-800"
          />
          <button onClick={generateAI} className="px-4 bg-purple-600 rounded-xl">
            AI
          </button>
        </div>

        {/* SEARCH */}
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchSong()}
          placeholder="Artist"
          className="w-full p-3 mb-2 rounded-xl bg-gray-900 border border-gray-800"
        />

        <input
          value={song}
          onChange={(e) => setSong(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchSong()}
          placeholder="Song"
          className="w-full p-3 mb-3 rounded-xl bg-gray-900 border border-gray-800"
        />

        {/* BUTTONS */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={searchSong} className="p-3 bg-purple-600 rounded-xl">
            Add
          </button>

          <button onClick={clearPlaylist} className="p-3 bg-gray-700 rounded-xl">
            Clear
          </button>

          <button
            onClick={() => setRepeat(!repeat)}
            className={`p-3 rounded-xl ${
              repeat
                ? "bg-purple-600 shadow-lg shadow-purple-900/40"
                : "bg-gray-700"
            }`}
          >
            🔁 Repeat
          </button>

          <button
            onClick={() => fileInputRef.current.click()}
            className="p-3 bg-purple-600 rounded-xl"
          >
            Upload
          </button>
        </div>

        {/* FILE */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleUpload}
          className="hidden"
        />

        {/* PLAYLIST */}
        <div className="space-y-3">
          {playlist.map((s, i) => (
            <div
              key={i}
              draggable
              onClick={() => playSong(i)}
              onDragStart={() => (dragItem.current = i)}
              onDragEnter={() => (dragOverItem.current = i)}
              onDragEnd={handleSort}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center gap-3 bg-gray-900 p-3 rounded-xl"
            >
              {s.thumbnail && <img src={s.thumbnail} className="w-14 rounded" />}
              <div className="flex-1 text-sm">{s.title}</div>
              <button onClick={(e) => {e.stopPropagation(); removeSong(i);}}>
                ❌
              </button>
            </div>
          ))}
        </div>

        {/* PLAYER */}
        {playlist[currentIndex] &&
          (playlist[currentIndex].local ? (
            <audio
              key={currentIndex}
              className="w-full mt-6"
              src={playlist[currentIndex].url}
              controls
              autoPlay
              loop={repeat}
            />
          ) : (
            <iframe
              key={currentIndex}
              width="0"
              height="0"
              src={`https://www.youtube.com/embed/${playlist[currentIndex].videoId}?autoplay=1&loop=${repeat ? 1 : 0}`}
              allow="autoplay"
            />
          ))}
      </div>
    </div>
  );
}
