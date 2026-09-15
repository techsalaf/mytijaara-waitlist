import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildSitemapXml, PUBLIC_ROUTES } from "../../scripts/generate-sitemap";

describe("Sitemap and SEO indexing", () => {
  it("generates a valid XML sitemap string", () => {
    const xml = buildSitemapXml();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://mytijaara.com/</loc>");
    expect(xml).toContain("<loc>https://mytijaara.com/about</loc>");
    expect(xml).toContain("<loc>https://mytijaara.com/download</loc>");
    expect(xml).toContain("<loc>https://mytijaara.com/partners</loc>");
  });

  it("public/sitemap.xml exists and matches generated content", () => {
    const sitemapPath = resolve(process.cwd(), "public", "sitemap.xml");
    expect(existsSync(sitemapPath)).toBe(true);

    const fileContent = readFileSync(sitemapPath, "utf-8").trim();
    for (const route of PUBLIC_ROUTES) {
      expect(fileContent).toContain(`<loc>https://mytijaara.com${route.path === "/" ? "/" : route.path}</loc>`);
    }
  });

  it("public/robots.txt exists and points to sitemap.xml", () => {
    const robotsPath = resolve(process.cwd(), "public", "robots.txt");
    expect(existsSync(robotsPath)).toBe(true);

    const robotsContent = readFileSync(robotsPath, "utf-8");
    expect(robotsContent).toContain("User-agent: *");
    expect(robotsContent).toContain("Sitemap: https://mytijaara.com/sitemap.xml");
    expect(robotsContent).toContain("Disallow: /admin");
  });
});
