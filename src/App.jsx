import { useState, useRef, useEffect } from "react";

export default function App() {
  const [vibe, setVibe] = useState("");
  const [artist, setArtist] = useState("");
  const [song, setSong] = useState("");

  const [playlists, setPlaylists] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeat, setRepeat] = useState(false);

  const fileInputRef = useRef();
  const dragItem = useRef();
  const dragOverItem = useRef();

  const active = playlists[currentPlaylist] || { name: "My Playlist", songs: [] };

  // 💾 LOAD
  useEffect(() => {
    const saved = localStorage.getItem("library");
    if (saved) {
      setPlaylists(JSON.parse(saved));
    } else {
      setPlaylists([{ name: "My Playlist", songs: [] }]);
    }
  }, []);

  // 💾 SAVE
  useEffect(() => {
    localStorage.setItem("library", JSON.stringify(playlists));
  }, [playlists]);

  // ➕ ADD SONG
  const addSong = (songObj) => {
    const updated = [...playlists];
    updated[currentPlaylist].songs.unshift(songObj);
    setPlaylists(updated);
  };

  // ❌ REMOVE
  const removeSong = (i) => {
    const updated = [...playlists];
    updated[currentPlaylist].songs.splice(i, 1);
    setPlaylists(updated);
  };

  // 🔀 DRAG
  const handleSort = () => {
    let list = [...active.songs];
    const dragged = list.splice(dragItem.current, 1)[0];
    list.splice(dragOverItem.current, 0, dragged);

    const updated = [...playlists];
    updated[currentPlaylist].songs = list;
    setPlaylists(updated);
  };

  // 🔁 RETRY
  const fetchRetry = async (url, retries = 3) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      return res.json();
    } catch {
      if (retries) {
        await new Promise(r => setTimeout(r, 800));
        return fetchRetry(url, retries - 1);
      }
      throw new Error();
    }
  };

  // 🔍 SEARCH
  const searchSong = async () => {
    if (!artist && !song) return;

    try {
      const d = await fetchRetry(`/search?q=${encodeURIComponent(artist + " " + song)}`);
      if (!d.items?.length) return alert("No results");

      const vid = d.items[0];

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

  // 🤖 AI FIXED
 const generateAI = async () => {
  if (!vibe) return;

  try {
    const res = await fetch("/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: vibe }),
    });

    const data = await res.json(); // ✅ FIXED

    console.log("AI:", data);

    const songs = data.songs;

    if (!songs || songs.length === 0) {
      alert("AI returned no songs");
      return;
    }

    let results = [];

    for (let s of songs) {
      const [a, t] = s.split(" - ");

      try {
        const d = await fetchRetry(`/search?q=${encodeURIComponent(a + " " + t)}`);

        if (d.items?.length) {
          results.push({
            title: d.items[0].snippet.title,
            videoId: d.items[0].id.videoId,
            thumbnail: d.items[0].snippet.thumbnails.medium.url,
          });
        }
      } catch {}
    }

    if (!results.length) {
      alert("AI worked but search failed");
      return;
    }

    results.forEach(addSong);

  } catch (err) {
    console.error(err);
    alert("AI failed");
  }
};

  // 📤 UPLOAD
  const handleUpload = (e) => {
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
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-xl p-4">

        {/* HEADER */}
        <h1 className="text-4xl text-center mb-6 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
          🎧 Playlist AI
        </h1>

        {/* PLAYLIST SWITCH */}
        <div className="flex gap-2 overflow-x-auto mb-4">
          {playlists.map((p, i) => (
            <button
              key={i}
              onClick={() => setCurrentPlaylist(i)}
              className={`px-3 py-1 rounded ${i===currentPlaylist ? "bg-purple-600" : "bg-gray-700"}`}
            >
              {p.name}
            </button>
          ))}
          <button onClick={newPlaylist} className="bg-purple-600 px-3 rounded">+</button>
        </div>

        {/* NAME */}
        <input
          value={active.name}
          onChange={(e)=>{
            const updated=[...playlists];
            updated[currentPlaylist].name=e.target.value;
            setPlaylists(updated);
          }}
          className="w-full text-center mb-4 bg-transparent"
        />

        {/* AI */}
        <input value={vibe} onChange={(e)=>setVibe(e.target.value)}
          onKeyDown={(e)=>e.key==="Enter"&&generateAI()}
          placeholder="Vibe..."
          className="w-full p-2 mb-2 bg-gray-900"
        />

        <button onClick={generateAI} className="w-full bg-purple-600 p-2 mb-4 rounded">
          Generate AI
        </button>

        {/* SEARCH */}
        <input value={artist} onChange={(e)=>setArtist(e.target.value)} placeholder="Artist" className="w-full p-2 mb-2 bg-gray-900"/>
        <input value={song} onChange={(e)=>setSong(e.target.value)} placeholder="Song" className="w-full p-2 mb-2 bg-gray-900"/>

        <button onClick={searchSong} className="w-full bg-purple-600 p-2 mb-4 rounded">
          Add Song
        </button>

        {/* ACTIONS */}
        <div className="flex gap-2 mb-4">
          <button onClick={clearPlaylist} className="flex-1 bg-gray-700 p-2 rounded">Clear</button>
          <button onClick={()=>setRepeat(!repeat)} className={`flex-1 p-2 rounded ${repeat?"bg-purple-600":"bg-gray-700"}`}>🔁</button>
          <button onClick={()=>fileInputRef.current.click()} className="flex-1 bg-purple-600 p-2 rounded">Upload</button>
        </div>

        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleUpload} hidden/>

        {/* SONGS */}
        {active.songs.map((s,i)=>(
          <div key={i} draggable
            onClick={()=>setCurrentIndex(i)}
            onDragStart={()=>dragItem.current=i}
            onDragEnter={()=>dragOverItem.current=i}
            onDragEnd={handleSort}
            onDragOver={(e)=>e.preventDefault()}
            className="flex gap-3 bg-gray-900 p-2 mb-2 rounded"
          >
            {s.thumbnail && <img src={s.thumbnail} className="w-12"/>}
            <div className="flex-1">{s.title}</div>
            <button onClick={(e)=>{e.stopPropagation();removeSong(i)}}>❌</button>
          </div>
        ))}

      </div>
    </div>
  );
}
