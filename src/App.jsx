import { useState, useRef, useEffect } from "react";

export default function App() {
  const [query, setQuery] = useState("");
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isPro, setIsPro] = useState(localStorage.getItem("pro") === "true");
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const audioRef = useRef(null);

  // Install prompt
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
    setDeferredPrompt(null);
  };

  const play = (track) => {
    if (audioRef.current) audioRef.current.pause();

    audioRef.current = new Audio(track.url);

    audioRef.current.onended = () => {
      const index = playlist.findIndex(
        (t) => t.videoId === track.videoId
      );

      let nextIndex = index + 1;
      if (nextIndex >= playlist.length) nextIndex = 0;

      play(playlist[nextIndex]);
    };

    audioRef.current.play();
  };

  const generateAI = () => {
    alert("AI coming (or connect backend)");
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const track = {
      title: file.name,
      videoId: "local-" + Date.now(),
      url: URL.createObjectURL(file),
    };

    setPlaylist((prev) => [track, ...prev]);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-6">🎧 Playlist AI</h1>

      <div className="w-full max-w-md flex gap-2 mb-4">
        <input
          className="bg-zinc-900 text-white p-2 rounded w-full"
          placeholder="Type a vibe..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          onClick={generateAI}
          className="bg-purple-600 px-3 rounded"
        >
          {loading ? "..." : "AI"}
        </button>
      </div>

      {/* Upload */}
      <input type="file" accept="audio/*" onChange={handleUpload} />

      {/* Playlist */}
      <div className="w-full max-w-md mt-4 flex flex-col gap-2">
        {playlist.map((t, i) => (
          <div
            key={i}
            className="bg-zinc-900 p-3 rounded flex justify-between"
          >
            <span className="truncate">{t.title}</span>
            <button onClick={() => play(t)}>▶</button>
          </div>
        ))}
      </div>

      {/* Install */}
      {deferredPrompt && (
        <button
          onClick={installApp}
          className="mt-4 bg-blue-600 px-4 py-2 rounded"
        >
          Install App 📱
        </button>
      )}

      {/* Pro */}
      {!isPro && (
        <button className="mt-6 bg-purple-600 px-4 py-2 rounded">
          Upgrade to Pro 🚀
        </button>
      )}
    </div>
  );
}
