"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Server, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { usePathname } from "next/navigation";
import Spinner from "@/components/Loading";

let hasServerStartedUp = false;
let globalHealthCheckPromise: Promise<boolean> | null = null;

const runSingleHealthCheck = async (): Promise<boolean> => {
  if (globalHealthCheckPromise) {
    return globalHealthCheckPromise;
  }

  globalHealthCheckPromise = (async () => {
    try {
      const response = await fetch("/omni-api/health", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (response.ok) {
        hasServerStartedUp = true;
        return true;
      }
    } catch {
      // Ignore fetch errors during wakeup phases
    }
    globalHealthCheckPromise = null; // Clear on failure to allow retry
    return false;
  })();

  return globalHealthCheckPromise;
};

export function ServerStartupOverlay() {
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(() => !hasServerStartedUp && pathname !== "/");
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [takingLongTime, setTakingLongTime] = useState(false);

  useEffect(() => {
    if (hasServerStartedUp || pathname === "/") {
      Promise.resolve().then(() => {
        setIsChecking(current => current ? false : current);
      });
      return;
    }

    Promise.resolve().then(() => {
      setIsChecking(current => !current ? true : current);
    });

    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    // Timeout to show waking up modal if server takes > 3 seconds
    const wakeUpTimeout = setTimeout(() => {
      if (isMounted) {
        setIsWakingUp(true);
      }
    }, 3000);

    // Timeout to show taking long time helper if server takes > 45 seconds
    const longTimeTimeout = setTimeout(() => {
      if (isMounted) {
        setTakingLongTime(true);
      }
    }, 45000);

    const performCheck = async () => {
      const isOnline = await runSingleHealthCheck();
      
      if (!isMounted) return;

      if (isOnline) {
        setIsChecking(false);
        setIsWakingUp(false);
        setTakingLongTime(false);
        clearTimeout(wakeUpTimeout);
        clearTimeout(longTimeTimeout);
        clearInterval(pollInterval);
      } else {
        // If first check failed, start polling every 3 seconds
        if (!pollInterval) {
          pollInterval = setInterval(performCheck, 3000);
        }
      }
    };

    performCheck();

    return () => {
      isMounted = false;
      clearTimeout(wakeUpTimeout);
      clearTimeout(longTimeTimeout);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pathname]);

  if (pathname === "/" || !isChecking) {
    return null;
  }

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-background">
      {/* 1. Show the premium full-screen spinner first */}
      <Spinner size="lg" className="h-full w-full" />

      {/* 2. Show the waking up dialog modal on top after a few seconds */}
      <AnimatePresence>
        {isWakingUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10000 flex items-center justify-center bg-background/80 backdrop-blur-lg"
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
    </div>
  );
}
