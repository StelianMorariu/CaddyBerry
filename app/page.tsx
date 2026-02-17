import Image from "next/image";
import CaddyEditor from "./editor";

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center gap-1.5 px-5 py-3 border-b border-zinc-800 bg-zinc-900 xl:px-8 2xl:px-16">
        <Image
          src="/logo.png"
          alt="CaddyBerry"
          width={32}
          height={32}
          className="shrink-0"
        />
        <div className="flex items-baseline gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight">CaddyBerry</h1>
          <span className="text-xs text-zinc-500">Caddyfile Editor</span>
        </div>
        <span className="text-xs text-zinc-600 ml-auto font-mono">v{process.env.APP_VERSION}</span>
      </header>

      {/* Editor area — centered with horizontal padding on large screens */}
      <main className="flex-1 min-h-0 w-full max-w-screen-2xl mx-auto xl:px-18 2xl:px-36">
        <CaddyEditor />
      </main>
    </div>
  );
}
