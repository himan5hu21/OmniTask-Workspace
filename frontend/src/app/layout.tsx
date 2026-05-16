import type { Metadata } from "next";
import { Inter, JetBrains_Mono} from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppQueryProvider } from "@/lib/query-client";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { OfflineOverlay } from "@/components/ui/offline-overlay";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: "OmniTask",
  description: "Team collaboration, chat, and task management workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col overflow-hidden" suppressHydrationWarning>
        <AppQueryProvider>
          <div id="app-content" className="flex-1 flex flex-col h-full min-h-0 transition-[filter] duration-300">
            {children}
            <OfflineOverlay />
          </div>
          <Toaster position="top-center" />
        </AppQueryProvider>
      </body>
    </html>
  );
}

