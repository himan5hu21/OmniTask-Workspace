"use client";

import { ReactNode } from "react";

type FeaturePlaceholderProps = {
  title: string;
  description: string;
  badge?: string;
  icon?: ReactNode;
};

export function FeaturePlaceholder({
  title,
  description,
  badge = "Coming soon",
  icon,
}: FeaturePlaceholderProps) {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card/80 p-8 shadow-sm">
        <div className="mb-5 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          {badge}
        </div>
        <div className="flex items-start gap-4">
          {icon ? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted/40 text-primary">
              {icon}
            </div>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
