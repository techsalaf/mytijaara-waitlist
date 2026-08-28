/**
 * No data room admin tab may decide anything from the truthiness of a JSX
 * element.
 *
 * `const state = (<LoadState … />); if (state || !res.data) return state;` reads
 * like a guard and is not one. A JSX element is a plain object, so the branch is
 * always taken; `LoadState` then rendered null once loading finished and all
 * five data-driven tabs painted an empty panel in production. `loadState()`
 * returns null when there is nothing to say, which is what the branch needs.
 *
 * This is the static half of the pair. `admin.data-room.tabs.test.tsx` mounts
 * the real components and asserts they paint; this one fails the build the
 * moment a new tab binds an element to a name and then branches on that name,
 * including a tab that has no render test yet.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTES_DIR = join(process.cwd(), "src", "routes");

function tabFiles(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter((name) => name.startsWith("admin.data-room") && name.endsWith(".tsx"))
    .filter((name) => !name.includes(".test."));
}

/** Names bound to a parenthesised JSX element: `const foo = (\n  <Bar …`. */
function jsxBoundNames(source: string): string[] {
  const names: string[] = [];
  const pattern = /const\s+(\w+)\s*=\s*\(\s*[\r\n]+\s*</g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) names.push(match[1]);
  return names;
}

describe("data room admin tabs", () => {
  it("has tabs to check", () => {
    // A glob that silently matches nothing would make every assertion below
    // vacuously true.
    expect(tabFiles().length).toBeGreaterThanOrEqual(7);
  });

  it.each(tabFiles())("%s never branches on a JSX element", (file) => {
    const source = readFileSync(join(ROUTES_DIR, file), "utf8");

    for (const name of jsxBoundNames(source)) {
      // Rendering it (`{name}`) is fine. Testing it is not.
      const branches = [
        new RegExp(`if\\s*\\(\\s*!?${name}\\b`),
        new RegExp(`\\b${name}\\s*\\|\\|`),
        new RegExp(`\\b${name}\\s*&&`),
        new RegExp(`\\b${name}\\s*\\?`),
      ];
      for (const branch of branches) {
        expect(
          branch.test(source),
          `${file} branches on \`${name}\`, which holds a JSX element and is therefore always truthy. ` +
            "Use `loadState(...)` from components/admin/dataroom/bits, which returns null when there is nothing to show.",
        ).toBe(false);
      }
    }
  });

  it.each(tabFiles())("%s imports loadState when it replaces its body", (file) => {
    const source = readFileSync(join(ROUTES_DIR, file), "utf8");
    if (!/if\s*\(\s*state\b/.test(source)) return;

    expect(source).toMatch(/const\s+state\s*=\s*loadState\(/);
    expect(source).toMatch(/\bloadState,?\s*\}?.*from "@\/components\/admin\/dataroom\/bits"/s);
  });
});
