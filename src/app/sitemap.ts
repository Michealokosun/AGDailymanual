import type { MetadataRoute } from "next";
import { getAllReadings } from "@/data/readings";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const readings = await getAllReadings();
  return [
    {
      url: siteUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    ...readings.map((reading) => ({
      url: `${siteUrl}/reading/${reading.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
