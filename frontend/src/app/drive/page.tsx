"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

interface DriveFile {
  name: string;
  size: number;
  modified: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString("pl-PL");
}

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "🖼";
  if (["mp4", "avi", "mkv", "mov", "webm"].includes(ext)) return "🎬";
  if (["mp3", "wav", "flac", "ogg", "aac"].includes(ext)) return "🎵";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "📦";
  if (["pdf"].includes(ext)) return "📄";
  if (["doc", "docx", "txt", "md", "rtf"].includes(ext)) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["exe", "msi", "deb", "rpm"].includes(ext)) return "⚙";
  return "📁";
}

export default function DrivePage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [usage, setUsage] = useState(0);
  const [maxBytes, setMaxBytes] = useState(15 * 1024 * 1024 * 1024);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const headers = useCallback(
    () => ({ "drive-token": token ?? "" }),
    [token]
  );

  const loadFiles = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/drive/files`, { headers: headers() });
    if (!res.ok) { setToken(null); return; }
    const data = await res.json();
    setFiles(data.files);
    setUsage(data.usage);
    setMaxBytes(data.max);
  }, [token, headers]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API}/drive/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) { setError("Nieprawidlowe haslo"); return; }
    const data = await res.json();
    setToken(data.token);
    setPassword("");
  };

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !token) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const form = new FormData();
      form.append("file", file);
      await fetch(`${API}/drive/upload`, {
        method: "POST",
        headers: headers(),
        body: form,
      });
    }
    setUploading(false);
    loadFiles();
  };

  const deleteFile = async (name: string) => {
    if (!confirm(`Usunac "${name}"?`)) return;
    await fetch(`${API}/drive/delete/${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers: headers(),
    });
    loadFiles();
  };

  const downloadFile = (name: string) => {
    const a = document.createElement("a");
    a.href = `${API}/drive/download/${encodeURIComponent(name)}`;
    // Can't set headers on <a> download, use fetch+blob
    fetch(a.href, { headers: headers() })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
      });
  };

  const usagePct = maxBytes > 0 ? (usage / maxBytes) * 100 : 0;

  // ── Login screen ──
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <form
          onSubmit={login}
          className="w-full max-w-sm p-8 rounded-2xl border border-card-border bg-card-bg/80 backdrop-blur-md"
        >
          <h1 className="text-2xl font-bold mb-1 text-center bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">
            Drive
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">Wprowadz haslo</p>
          {error && (
            <p className="text-neon-pink text-sm text-center mb-4">{error}</p>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Haslo"
            autoFocus
            className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-card-border text-foreground placeholder:text-gray-600 focus:outline-none focus:border-neon-cyan/50 transition mb-4"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-neon-cyan to-neon-purple text-black hover:opacity-90 transition cursor-pointer"
          >
            Wejdz
          </button>
        </form>
      </div>
    );
  }

  // ── File manager ──
  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">
          Drive
        </h1>
        <button
          onClick={() => setToken(null)}
          className="text-sm text-gray-500 hover:text-neon-pink transition cursor-pointer"
        >
          Wyloguj
        </button>
      </div>

      {/* Usage bar */}
      <div className="mb-6 p-4 rounded-xl border border-card-border bg-card-bg/60">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Uzycie dysku</span>
          <span className="text-gray-300">
            {formatSize(usage)} / {formatSize(maxBytes)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(usagePct, 100)}%`,
              background:
                usagePct > 90
                  ? "var(--neon-pink)"
                  : usagePct > 70
                  ? "var(--neon-purple)"
                  : "var(--neon-cyan)",
            }}
          />
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); }}
        onClick={() => fileInput.current?.click()}
        className={`mb-6 p-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
          dragOver
            ? "border-neon-cyan bg-neon-cyan/5"
            : "border-card-border hover:border-neon-cyan/30 bg-card-bg/30"
        }`}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />
        {uploading ? (
          <p className="text-neon-cyan animate-pulse">Wgrywanie...</p>
        ) : (
          <>
            <p className="text-gray-400 text-lg mb-1">
              Przeciagnij pliki lub kliknij
            </p>
            <p className="text-gray-600 text-sm">
              Maks. {formatSize(maxBytes - usage)} wolnego
            </p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <p className="text-gray-600 text-center py-12">Brak plikow</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-3 p-3 rounded-xl border border-card-border bg-card-bg/40 hover:bg-card-bg/70 transition group"
            >
              <span className="text-xl flex-shrink-0">{fileIcon(f.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-200">
                  {f.name}
                </p>
                <p className="text-xs text-gray-600">
                  {formatSize(f.size)} &middot; {formatDate(f.modified)}
                </p>
              </div>
              <button
                onClick={() => downloadFile(f.name)}
                className="px-3 py-1.5 text-xs rounded-lg border border-card-border text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                Pobierz
              </button>
              <button
                onClick={() => deleteFile(f.name)}
                className="px-3 py-1.5 text-xs rounded-lg border border-card-border text-gray-400 hover:text-neon-pink hover:border-neon-pink/40 transition opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                Usun
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
