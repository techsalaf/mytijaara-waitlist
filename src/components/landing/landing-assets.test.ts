import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { INSIDE_SCREENS } from "./inside-the-app";
import { PARTNER_SCREENS } from "./partners";

/**
 * Every screenshot on the landing page 404'd in production.
 *
 * Two separate causes. "Inside the app" pointed all nine cards at
 * `/placeholder-phone.svg`, so it rendered the same grey outline nine times. The
 * Partners cards imported `src/assets/screens/*.png.asset.json` and used the
 * `url` field, which is a `/__l5e/assets-v1/<uuid>/…` path that only resolves
 * inside the Lovable editor's dev server.
 *
 * These tests read the real `public/` directory, so a renamed or deleted asset
 * fails here instead of shipping a broken image.
 */

const PUBLIC_DIR = resolve(__dirname, "../../../public");

/** Resolves a site-root path (`/screens/x.webp`) to its file on disk. */
function publicFile(src: string): string {
  return resolve(PUBLIC_DIR, src.replace(/^\//, ""));
}

describe("Inside the app screens", () => {
  it("shows nine screens, as the section heading promises", () => {
    expect(INSIDE_SCREENS).toHaveLength(9);
  });

  it("points every card at a file that exists in public/", () => {
    for (const screen of INSIDE_SCREENS) {
      expect(existsSync(publicFile(screen.src)), `missing asset: ${screen.src}`).toBe(true);
    }
  });

  it("uses nine distinct images, not the same placeholder nine times", () => {
    const unique = new Set(INSIDE_SCREENS.map((s) => s.src));
    expect(unique.size).toBe(9);
  });

  it("does not reference the placeholder phone outline any more", () => {
    for (const screen of INSIDE_SCREENS) {
      expect(screen.src).not.toContain("placeholder-phone");
    }
  });

  it("gives every screen a caption and a tag, since both are rendered", () => {
    for (const screen of INSIDE_SCREENS) {
      expect(screen.caption.trim().length).toBeGreaterThan(0);
      expect(screen.tag.trim().length).toBeGreaterThan(0);
    }
  });

  it("serves them from the site root, so the path works in the built output", () => {
    for (const screen of INSIDE_SCREENS) {
      expect(screen.src.startsWith("/screens/")).toBe(true);
    }
  });
});

describe("Partner screens", () => {
  it("points every partner card at a file that exists in public/", () => {
    for (const [role, src] of Object.entries(PARTNER_SCREENS)) {
      expect(existsSync(publicFile(src)), `missing ${role} asset: ${src}`).toBe(true);
    }
  });

  it("no longer resolves through the editor-only /__l5e asset path", () => {
    for (const src of Object.values(PARTNER_SCREENS)) {
      expect(src).not.toContain("__l5e");
      expect(src).not.toContain("asset.json");
    }
  });
});

describe("no landing component imports a Lovable asset manifest", () => {
  /**
   * The `.asset.json` files are still in the tree (they are the record of where
   * the originals came from), but importing one puts an editor-only URL into the
   * production bundle. This sweeps the whole landing directory rather than
   * trusting the two components above.
   */
  it("sweeps src/components/landing for .asset.json imports", () => {
    const dir = resolve(__dirname);
    const offenders: string[] = [];

    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const source = readFileSync(resolve(dir, file), "utf8");
      // An import statement, not a mention in a comment.
      if (/^\s*import[^;]*\.asset\.json/m.test(source)) offenders.push(file);
    }

    expect(offenders, `these still import an editor-only asset manifest: ${offenders.join(", ")}`).toEqual([]);
  });
});
