import type { MetadataRoute } from "next"

//

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://www.studyfast.now/", changeFrequency: "monthly", priority: 1 },
  ]
}
