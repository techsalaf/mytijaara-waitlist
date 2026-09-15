import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const PUBLIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: 1.0 },
  { path: "/about", changefreq: "weekly", priority: 0.9 },
  { path: "/download", changefreq: "weekly", priority: 0.9 },
  { path: "/partners", changefreq: "weekly", priority: 0.8 },
  { path: "/referral-rewards", changefreq: "weekly", priority: 0.8 },
  { path: "/faq", changefreq: "weekly", priority: 0.7 },
  { path: "/contact", changefreq: "monthly", priority: 0.7 },
  { path: "/careers", changefreq: "monthly", priority: 0.6 },
  { path: "/terms", changefreq: "monthly", priority: 0.5 },
  { path: "/privacy", changefreq: "monthly", priority: 0.5 },
  { path: "/cookies", changefreq: "monthly", priority: 0.5 },
] as const;

export function buildSitemapXml(baseUrl = "https://mytijaara.com"): string {
  const urls = PUBLIC_ROUTES.map(
    (r) => `  <url>
    <loc>${baseUrl}${r.path === "/" ? "/" : r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`,
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const outPath = resolve(process.cwd(), "public", "sitemap.xml");
  writeFileSync(outPath, buildSitemapXml(), "utf-8");
  console.log(`Generated sitemap with ${PUBLIC_ROUTES.length} routes at ${outPath}`);
}
