import type { MetadataRoute } from "next"

//

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/home", "/account", "/documents/", "/api/"],
    },
    sitemap: "https://www.studyfast.now/sitemap.xml",
  }
}
