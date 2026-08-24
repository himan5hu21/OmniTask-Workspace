import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://omnitask.himanshudev.dpdns.org";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/organizations", "/messages", "/profile", "/settings"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
