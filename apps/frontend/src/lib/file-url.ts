"use client";

const DOWNLOAD_QUERY = "download=true";

const normalizeFileUrl = (fileUrl?: string | null) => {
  if (!fileUrl) return "";

  try {
    const parsed = new URL(fileUrl);
    if (parsed.pathname.startsWith("/uploads/")) {
      return parsed.pathname;
    }
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return fileUrl.split("?")[0] || "";
  }
};

export const buildAuthenticatedFileUrl = (fileUrl?: string | null) => {
  return normalizeFileUrl(fileUrl);
};

export const buildAuthenticatedDownloadUrl = (fileUrl?: string | null) => {
  const normalizedUrl = normalizeFileUrl(fileUrl);
  if (!normalizedUrl) return "";

  return `${normalizedUrl}?${DOWNLOAD_QUERY}`;
};
