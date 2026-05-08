import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name?: string, fallback: string = "OT") {
  if (!name) return fallback;

  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  const normalized = words[0] ?? name;
  if (normalized.length === 1) return `${normalized}${normalized}`.toUpperCase();
  return normalized.slice(0, 2).toUpperCase();
}

