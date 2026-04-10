"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function ContentSpinner({
  title = "Loading content",
  description = "Please wait while this section is prepared.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_40%)] p-6",
        className
      )}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white/90 px-8 py-10 text-center shadow-sm backdrop-blur">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}
