import type { Metadata } from "next";
import { Inter, JetBrains_Mono} from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppQueryProvider } from "@/lib/query-client";
import { OrbitalLoader } from "@/components/ui/orbital-loader";
import { OfflineOverlay } from "@/components/ui/offline-overlay";
import { ServerStartupOverlay } from "@/components/ui/server-startup-overlay";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL("https://omnitask.himanshudev.dpdns.org"),
  title: {
    default: "OmniTask - Team Collaboration, Tasks & Real-Time Chat",
    template: "%s | OmniTask"
  },
  description: "OmniTask is a team collaboration workspace for managing tasks, projects, team chat, and software development workflows in one place.",
  keywords: [
    "OmniTask",
    "OmniTask team collaboration",
    "OmniTask task management",
    "OmniTask project management",
    "OmniTask team chat",
    "team collaboration software",
    "task management software",
    "developer productivity",
  ],
  openGraph: {
    title: "OmniTask - Team Collaboration, Tasks & Real-Time Chat",
    description: "OmniTask is a team collaboration workspace for managing tasks, projects, team chat, and software development workflows.",
    url: "https://omnitask.himanshudev.dpdns.org",
    siteName: "OmniTask",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "OmniTask Workspace",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
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
            <ServerStartupOverlay />
          </div>
          <Toaster position="top-center" />
        </AppQueryProvider>
      </body>
    </html>
  );
}

