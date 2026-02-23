import { Waves } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-3">
        <Waves className="w-6 h-6 text-cyan-400" />
        <h1 className="text-xl font-semibold tracking-wide">PULSE</h1>
      </div>
      <div className="text-xs text-zinc-500">
        Gesture Synthesizer
      </div>
    </header>
  );
}
