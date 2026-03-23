import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function App() {
  const [query, setQuery] = useState("");
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPro, setIsPro] = useState(localStorage.getItem("pro") === "true");
  const audioRef = useRef(null);

  // -------------------------
  // IndexedDB
  // -------------------------
  const openDB = () =>
    new Promise((resolve) => {
      const req = indexedDB.open("music-db", 1);

      req.onupgradeneeded = () => {
        req.result.createObjectStore("songs", { keyPath: "id" });
      };

      req.onsuccess = () => resolve(req.result);
    });

  const saveToDB = async (track, file) => {
    const db = await openDB();
    const tx = db.transaction("songs", "readwrite");
    const store = tx.objectStore("songs");

    store.put({
      id: track.videoId,
      file,
      title: track.title,
    });
  };

  useEffect(() => {
    const load = async () => {
      const db = await openDB();
      const tx = db.transaction("songs", "readonly");
      const store = tx.objectStore("songs");
      const req = store.getAll();

      req.onsuccess = () => {
        const tracks = req.result.map((item) => ({
          title: item.title,
          videoId: item.id,
          local: true,
          url: URL.createObjectURL(item.file),
          thumbnail: "/icon-192.png",
        }));

        setPlaylist(tracks);
      };
    };

    load();
  }, []);

  // -------------------------
  // SEARCH
  // -------------------------
  const search = async (q) => {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    return {
      title: item.snippet.title,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails.medium.url,
    };
  };

  // -------------------------
  // PLAY
  // -------------------------
  const play = async (track) => {
    try {
      if (track.local) {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(track.url);
        audioRef.current.play();
        return;
      }

      const res = await fetch(`/api/download?videoId=${track.videoId}`);

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        if (audioRef.current) audioRef.current.pause();

        audioRef.current = new Audio(url);
        audioRef.current.play();
        return;
      }

      throw new Error();
    } catch {
      try {
        const sres = await fetch(`/api/spotify-search?q=${track.title}`);
        const sdata = await sres.json();
        const url = sdata?.tracks?.items?.[0]?.external_urls?.spotify;

        if (url) {
          window.open(url, "_blank");
          return;
        }

        throw new Error();
      } catch {
        window.open(`https://www.youtube.com/watch?v=${track.videoId}`, "_blank");
      }
    }
  };

  // -------------------------
  // UPLOAD (FREE)
  // -------------------------
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    const track = {
      title: file.name,
      videoId: "local-" + Date.now(),
      thumbnail: "/icon-192.png",
      local: true,
      url,
    };

    setPlaylist((prev) => [track, ...prev]);
    await saveToDB(track, file);

    // PRO cloud sync
    if (isPro) {
      const form = new FormData();
      form.append("file", file);

      await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
    }
  };

  // -------------------------
  // AI PLAYLIST (PRO)
  // -------------------------
  const generateAI = async () => {
    if (!isPro) {
      alert("Pro required for AI playlists 🚀");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system: "You are a music expert",
          messages: [
            {
              role: "user",
              content: `Give 15 songs for ${query} as Artist - Song list`,
            },
          ],
        }),
      });

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";

      const lines = text.split("\n").filter((l) => l.trim());

      const newTracks = [];

      for (let line of lines) {
        line = line.replace(/^\d+\.\s*/, "");
        const track = await search(line);
        if (track) newTracks.push(track);
      }

      setPlaylist(newTracks);
    } catch {
      alert("AI failed");
    }

    setLoading(false);
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-6">🎧 Playlist AI</h1>

      <div className="w-full max-w-md flex gap-2 mb-4">
        <Input
          placeholder="Type a vibe..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <Button onClick={generateAI}>
          {loading ? "..." : "AI"}
        </Button>
      </div>

      {/* Upload */}
      <input
        type="file"
        accept="audio/*"
        onChange={handleUpload}
        hidden
        id="upload"
      />
      <label htmlFor="upload">
        <Button className="bg-green-600 mb-4">Upload</Button>
      </label>

      {/* Playlist */}
      <div className="w-full max-w-md flex flex-col gap-3">
        {playlist.map((t, i) => (
          <Card key={i} className="bg-zinc-900">
            <CardContent className="flex items-center gap-3 p-3">
              <img src={t.thumbnail} className="w-12 h-12 rounded-lg" />
              <div className="flex-1 text-sm truncate">{t.title}</div>
              <Button onClick={() => play(t)}>▶</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PRO */}
      {!isPro && (
        <Button
          className="mt-6 bg-purple-600"
          onClick={() => (window.location.href = "/pay")}
        >
          Upgrade to Pro 🚀
        </Button>
      )}
    </div>
  );
}
