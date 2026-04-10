"use client";

import { Loader2 } from "lucide-react";

export function MainSpinner({
  label = "Loading OmniTask",
}: {
  label?: string;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/5 px-10 py-12 backdrop-blur-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-2xl">
          <span className="text-3xl font-bold tracking-tight">O</span>
        </div>

        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
          <p className="text-sm font-medium tracking-wide text-slate-200">{label}</p>
        </div>
      </div>
    </div>
  );
}
