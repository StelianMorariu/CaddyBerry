import CaddyEditor from "./editor";

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800 bg-zinc-900">
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <circle cx="14" cy="14" r="13" stroke="#10b981" strokeWidth="2" />
          <circle cx="14" cy="14" r="6" fill="#10b981" />
        </svg>
        <h1 className="text-lg font-semibold tracking-tight">CaddyBerry</h1>
        <span className="text-xs text-zinc-500 ml-1">Caddyfile Editor</span>
        <span className="text-xs text-zinc-600 ml-auto font-mono">v{process.env.APP_VERSION}</span>
      </header>

      {/* Editor area */}
      <main className="flex-1 min-h-0">
        <CaddyEditor />
      </main>
    </div>
  );
}
