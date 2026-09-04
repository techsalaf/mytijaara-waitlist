/**
 * One-shot codemod: fold the duplicated public-page loader + LaunchStateProvider
 * boilerplate in `src/routes/*.tsx` into `loadPublicPageData()` and the
 * `PublicLayout` props, and demote the nested `<main>` each page rendered inside
 * `PublicLayout`'s own `<main>` landmark.
 *
 * Kept in the repo as the record of the transformation. Re-running it is a
 * no-op: every replacement is guarded by a match check.
 *
 *   node scripts/codemod-public-routes.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROUTES = [
  "contact",
  "cookies",
  "download",
  "faq",
  "partners",
  "privacy",
  "terms",
  "referral-rewards",
];

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** Drop an import line when its bindings are no longer referenced. */
function pruneImport(src, line, ...identifiers) {
  if (!src.includes(line)) return src;
  const without = src.replace(line + "\n", "");
  const stillUsed = identifiers.some((id) => {
    const hits = without.match(new RegExp(`\\b${id}\\b`, "g"));
    return hits && hits.length > 0;
  });
  return stillUsed ? src : without;
}

let touched = 0;

for (const name of ROUTES) {
  const file = join(ROOT, "src", "routes", `${name}.tsx`);
  const original = readFileSync(file, "utf8");
  let src = original;

  // 1. Collapse the loader.
  src = src.replace(/ {2}loader: async \(\) => \{[\s\S]*?\n {2}\},\n/, "  loader: () => loadPublicPageData(),\n");
  src = src.replace(
    / {2}loader: async \(\) => \{\n {4}const brandingResult[\s\S]*?\n {2}\},\n/,
    "  loader: () => loadPublicPageData(),\n",
  );

  // 2. Swap the launch-config import for the shared loader.
  if (src.includes('import { normalizeLaunchConfig } from "@/lib/launch/config";')) {
    src = src.replace(
      'import { normalizeLaunchConfig } from "@/lib/launch/config";',
      'import { loadPublicPageData } from "@/lib/public-page-data";',
    );
  } else if (!src.includes("loadPublicPageData }")) {
    src = src.replace(
      'import { PublicLayout } from "@/components/landing/public-layout";',
      'import { loadPublicPageData } from "@/lib/public-page-data";\nimport { PublicLayout } from "@/components/landing/public-layout";',
    );
  }

  // 3. PublicLayout now owns the launch provider.
  src = src.replace(
    /( *)<LaunchStateProvider initialConfig=\{launchConfig\} initialNow=\{serverNow\}>\n *<PublicLayout ([^\n]*)>\n/,
    (_m, indent, rest) => `${indent}<PublicLayout launchConfig={launchConfig} serverNow={serverNow} ${rest}>\n`,
  );
  src = src.replace(/\n( *)<\/PublicLayout>\n *<\/LaunchStateProvider>\n/, "\n$1</PublicLayout>\n");

  // referral-rewards never had a provider — give it the props.
  src = src.replace(
    /<PublicLayout branding=\{branding\}>/,
    "<PublicLayout launchConfig={launchConfig} serverNow={serverNow} cmsData={cms} branding={branding}>",
  );
  src = src.replace(
    /const \{ branding \} = Route\.useLoaderData\(\);/,
    "const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();",
  );

  // 4. PublicLayout owns the page's single <main> landmark.
  src = src.replace(/<main className="([^"]*)">/, '<div className="$1">');
  src = src.replace(/<\/main>/, "</div>");

  // 5. De-indent the block that lost its LaunchStateProvider wrapper.
  if (original.includes("<LaunchStateProvider") && !src.includes("<LaunchStateProvider")) {
    const open = src.indexOf("    <PublicLayout ");
    const close = src.indexOf("    </PublicLayout>");
    if (open > -1 && close > open) {
      const head = src.slice(0, open);
      const body = src.slice(open, close + "    </PublicLayout>".length);
      const tail = src.slice(close + "    </PublicLayout>".length);
      const deindented = body
        .split("\n")
        .map((l, i) => (i === 0 ? l : l.startsWith("  ") ? l.slice(2) : l))
        .join("\n");
      src = head + deindented + tail;
    }
  }

  // 6. Prune imports the collapsed loader made dead.
  src = pruneImport(src, 'import { serverGet } from "@/lib/api";', "serverGet");
  src = pruneImport(src, 'import type { CmsSection } from "@/lib/api";', "CmsSection");
  src = pruneImport(src, 'import type { PublicBranding } from "@/lib/api/settings";', "PublicBranding");
  src = pruneImport(src, 'import { settingsApi } from "@/lib/api/settings";', "settingsApi");
  src = pruneImport(
    src,
    'import { LaunchStateProvider } from "@/components/launch/launch-state-provider";',
    "LaunchStateProvider",
  );

  if (src !== original) {
    writeFileSync(file, src);
    touched += 1;
    console.log(`rewrote src/routes/${name}.tsx`);
  } else {
    console.log(`unchanged  src/routes/${name}.tsx`);
  }
}

console.log(`\n${touched}/${ROUTES.length} route files rewritten`);
