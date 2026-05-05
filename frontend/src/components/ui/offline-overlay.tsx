"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useIsMounted } from "@/hooks/useIsMounted";

export function OfflineOverlay() {
  const isOnline = useOnlineStatus();
  const isMounted = useIsMounted();
  const [show, setShow] = useState(false);

  // Sync state during render if we go back online
  // This avoids the "cascading render" warning from calling setState in useEffect
  if (isOnline && show) {
    setShow(false);
  }

  // Add a small delay before showing to avoid flickering on micro-drops
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!isOnline) {
      timeout = setTimeout(() => setShow(true), 1000);
    }
    return () => clearTimeout(timeout);
  }, [isOnline]);

  if (!isMounted) return null;

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-9999 flex items-center justify-center bg-background/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <WifiOff size={40} />
              </div>
              
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
                No Internet Connection
              </h2>
              
              <p className="mb-8 text-muted-foreground">
                It looks like you&apos;re offline. Please check your network settings and try again.
              </p>
              
              <div className="flex w-full flex-col gap-3">
                <Button 
                  onClick={handleRetry}
                  className="h-12 w-full rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                
                <p className="text-xs text-muted-foreground/60">
                  Your changes will be synced once you&apos;re back online.
                </p>
              </div>
            </div>
          </motion.div>
          
          {/* Decorative background elements */}
          <div className="absolute top-1/4 left-1/4 -z-10 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 -z-10 h-64 w-64 rounded-full bg-destructive/5 blur-[100px]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
