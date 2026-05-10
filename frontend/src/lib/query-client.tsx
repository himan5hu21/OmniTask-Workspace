"use client";

import React, { useState, useEffect, Suspense } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Lazy load devtools for production
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import("@tanstack/react-query-devtools/production").then((d) => ({
    default: d.ReactQueryDevtools,
  }))
);

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: QueryClient;
    toggleDevtools: () => void;
  }
}

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [showDevtools, setShowDevtools] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Connect to browser extension
      window.__TANSTACK_QUERY_CLIENT__ = queryClient;
      
      // 2. Add production toggle helper
      window.toggleDevtools = () => setShowDevtools((old) => !old);
    }
  }, [queryClient]);

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
      
      {/* Standard DevTools (Development only by default) */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      
      {/* Production DevTools (Lazy loaded) */}
      {showDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtoolsProduction />
        </Suspense>
      )}
    </TanStackQueryClientProvider>
  );
}

export { createQueryClient };
