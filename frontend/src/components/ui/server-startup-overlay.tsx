"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Server, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { usePathname } from "next/navigation";

export function ServerStartupOverlay() {
  const pathname = usePathname();
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [takingLongTime, setTakingLongTime] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    let longTimeTimeout: NodeJS.Timeout;
    let initialDelayTimeout: NodeJS.Timeout;
    
    let isMounted = true;
    let abortController: AbortController | null = null;

    const checkServerHealth = async () => {
      // Abort any pending check request to avoid overlapping connections
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();

      try {
        const response = await fetch("/omni-api/health", {
          signal: abortController.signal,
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (response.ok && isMounted) {
          setIsOnline(true);
          setIsWakingUp(false);
          setTakingLongTime(false);
          
          // Clear timeout and stop polling once server is online
          clearTimeout(longTimeTimeout);
          clearInterval(checkInterval);
        } else if (isMounted) {
          throw new Error("Server not responding correctly");
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;

        if (isMounted) {
          // If server is not responding, it is waking up or down
          setIsWakingUp(true);
        }
      }
    };

    // 1. Run check immediately on mount
    checkServerHealth();

    // 2. Poll every 3 seconds while server is offline
    checkInterval = setInterval(() => {
      checkServerHealth();
    }, 3000);

    // 3. Show wakeup overlay only if server takes > 1.5 seconds to respond
    // (Prevents overlay flash for users when server is already awake)
    initialDelayTimeout = setTimeout(() => {
      if (isOnline !== true && isMounted) {
        setIsWakingUp(true);
      }
    }, 1500);

    // 4. Show a helper/reload message if server takes > 45 seconds to respond
    longTimeTimeout = setTimeout(() => {
      if (isOnline !== true && isMounted) {
        setTakingLongTime(true);
      }
    }, 45000);

    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
      clearInterval(checkInterval);
      clearTimeout(longTimeTimeout);
      clearTimeout(initialDelayTimeout);
    };
  }, [isOnline]);

  // Only display the overlay if server is waking up AND we are not on the landing page ("/")
  // Visitors reading the public landing page can do so immediately, but are guided
  // with the overlay as soon as they try to login, sign up, or load the dashboard.
  const shouldShowOverlay = isWakingUp && pathname !== "/";

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {shouldShowOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-lg"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className="mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              {/* Outer Glowing Ring with Orbital Loader */}
              <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
                <OrbitalLoader size="xl" className="absolute" />
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_15px_rgba(79,110,247,0.2)]">
                  <Server size={32} className="animate-pulse" />
                </div>
              </div>

              <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
                {takingLongTime ? "Server is taking longer to start" : "Waking up the server"}
              </h2>

              <p className="mb-6 font-sans text-sm text-muted-foreground leading-relaxed">
                {takingLongTime ? (
                  "The free hosting instance is taking longer than usual to boot up. Please hold on a bit longer, or try reloading the page."
                ) : (
                  "We use a free backend hosting tier which spins down after 15 minutes of inactivity. Starting it up takes about 30 to 50 seconds. Thanks for your patience!"
                )}
              </p>

              <div className="flex w-full flex-col gap-3">
                {takingLongTime && (
                  <Button
                    onClick={handleReload}
                    className="h-12 w-full rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin-reverse" />
                    Reload Page
                  </Button>
                )}

                <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Connecting to services...
                </div>
              </div>
            </div>
          </motion.div>

          {/* Decorative glowing highlights */}
          <div className="absolute top-1/3 left-1/3 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/3 right-1/3 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-[120px]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
