"use client";

import { useEffect, useState } from "react";
import { X, Download, FileText, FileCode, Eye, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

export function FilePreviewDialog({
  open,
  onOpenChange,
  fileName,
  fileUrl,
  fileSize,
}: FilePreviewDialogProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const ext = fileName ? (fileName.split(".").pop()?.toLowerCase() || "") : "";
  const isImage = fileName ? /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName) : false;
  const isVideo = fileName ? /\.(mp4|webm|ogg|mov)$/i.test(fileName) : false;
  const isPdf = ext === "pdf";
  const isCodeOrText = [
    "txt", "js", "jsx", "ts", "tsx", "html", "css", "json", "md", "php", 
    "py", "sql", "go", "java", "sh", "yml", "yaml", "xml", "ini", "conf", 
    "env", "lock", "json5", "sass", "scss", "less", "toml"
  ].includes(ext);

  const downloadUrl = fileUrl ? `${fileUrl}${fileUrl.includes("?") ? "&" : "?"}download=true` : "";

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout | null = null;

    if (open && isCodeOrText && fileUrl) {
      // Defer synchronous resets to resolve cascading React rendering warnings
      timer = setTimeout(() => {
        if (active) {
          setLoading(true);
          setError(null);
          setContent("");
        }
      }, 0);
      
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to load file content (${res.status})`);
          }
          return res.text();
        })
        .then((text) => {
          if (active) {
            setContent(text);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error fetching file content:", err);
          if (active) {
            setError(err.message || "Failed to load file contents.");
            setLoading(false);
          }
        });
    }

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [open, fileUrl, isCodeOrText]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 1;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-4xl w-[90vw] md:w-[85vw] h-[85vh] flex flex-col p-0 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden gap-0">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {isCodeOrText ? (
                <FileCode className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-bold text-foreground truncate pr-6" title={fileName}>
                {fileName}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground/80 font-medium mt-0.5">
                {formatSize(fileSize)} • Click download to save locally
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadUrl}
              download={fileName}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-md shadow-primary/10 hover:bg-primary/95 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Modal Preview Body */}
        <div className="flex-1 min-h-0 bg-background/50 p-6 flex flex-col items-stretch">
          
          {/* 1. Loader / Spinner */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground font-semibold">Reading file contents...</p>
            </div>
          )}

          {/* 2. Error State */}
          {error && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 max-w-md mx-auto text-center py-12">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <h3 className="text-sm font-bold text-foreground">Failed to Preview File</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
              <a
                href={downloadUrl}
                download={fileName}
                className="mt-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download and view offline
              </a>
            </div>
          )}

          {/* 3. Text / Code Viewer */}
          {isCodeOrText && !loading && !error && (
            <div className="flex-1 min-h-0 w-full rounded-xl border border-border/80 bg-muted/40 font-mono text-xs overflow-hidden flex flex-col shadow-inner">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/60 text-[10px] text-muted-foreground font-semibold select-none">
                <span>PREVIEW</span>
                <span className="uppercase">{ext} file</span>
              </div>
              <pre className="flex-1 overflow-auto p-4 custom-scrollbar whitespace-pre text-foreground bg-muted/20 text-left select-text focus:outline-none">
                <code className="block wrap-anywhere whitespace-pre">{content || "/* Empty File */"}</code>
              </pre>
            </div>
          )}

          {/* 4. PDF Viewer */}
          {isPdf && !loading && (
            <iframe 
              src={`${fileUrl}#toolbar=0`} 
              className="flex-1 w-full h-full rounded-xl border border-border/80 shadow-md bg-background"
              title={fileName}
            />
          )}

          {/* 5. Image Lightbox */}
          {isImage && !loading && (
            <div className="flex-1 flex items-center justify-center min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={fileName}
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl border border-border bg-card shadow-lg animate-in zoom-in-95 duration-200"
              />
            </div>
          )}

          {/* 6. Video Player */}
          {isVideo && !loading && (
            <div className="flex-1 flex items-center justify-center min-h-0">
              <video
                src={fileUrl}
                controls
                className="max-h-[68vh] w-full max-w-[640px] object-contain rounded-xl border border-border bg-card shadow-lg"
              />
            </div>
          )}

          {/* 7. Unsupported / Binary Fallback (Zip, Tar, Exe, etc) */}
          {!isCodeOrText && !isPdf && !isImage && !isVideo && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 max-w-md mx-auto text-center py-12">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{fileName}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This file format cannot be previewed directly in the browser. 
                Please download it to view it offline.
              </p>
              <a
                href={downloadUrl}
                download={fileName}
                className="mt-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/95 transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Download File ({formatSize(fileSize)})
              </a>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
