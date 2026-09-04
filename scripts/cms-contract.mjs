/**
 * CMS contract auditor.
 *
 * Three independent places describe the shape of a CMS section's `data`:
 *
 *   1. the admin editor    — `useCmsSection<T>(slug, defaults)` in src/routes/admin.cms.*.tsx
 *   2. the database seed   — `CmsSectionSeeder::SECTIONS` in the Laravel app
 *   3. the public component — `useCmsData(slug, FALLBACK)` in src/components/**
 *
 * Nothing forces them to agree, and when they disagree the failure is silent.
 * `mergeSectionData` copies every saved key over the fallback, so a key the
 * editor writes but the component never reads is merged in and then ignored:
 * the administrator edits a field, the save succeeds, the DB row changes, and
 * the page keeps rendering the bundled default. That is invisible from either
 * end — which is exactly the class of bug this file makes impossible.
 *
 * Discovery is automatic. Call sites are found by parsing the TypeScript AST,
 * not by regex over source text and not from a hand-written map, so a new
 * section or a renamed field is picked up without editing this file.
 *
 * Run it: `node scripts/cms-contract.mjs`
 * Gate it: src/lib/cms/contract.test.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";

export const ROOT = resolve(import.meta.dirname, "..");

/** Source trees worth parsing. Tests and generated files are skipped. */
const SOURCE_DIRS = ["src/routes", "src/components", "src/lib"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.(test|spec)\.tsx?$/.test(entry)) continue;
    if (entry === "routeTree.gen.ts") continue;
    out.push(full);
  }
  return out;
}

export function sourceFiles() {
  return SOURCE_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
}

function parse(file) {
  return ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function eachNode(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => eachNode(child, visit));
}

function propertyName(member) {
  const name = member.name;
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

/** Top-level keys of an object literal, plus `parent.child` for nested objects. */
function objectLiteralKeys(node, prefix = "", depth = 0) {
  const keys = new Set();
  if (!ts.isObjectLiteralExpression(node) || depth > 2) return keys;
  for (const member of node.properties) {
    const name = propertyName(member);
    if (!name) continue;
    const path = prefix ? `${prefix}.${name}` : name;
    keys.add(path);
    const value = ts.isPropertyAssignment(member) ? member.initializer : null;
    if (value && ts.isObjectLiteralExpression(value)) {
      for (const nested of objectLiteralKeys(value, path, depth + 1)) keys.add(nested);
    }
    // `key: [{a, b}]` — describe the item shape as `key[].a`, because a list
    // editor and a list renderer disagreeing on an item field is the same bug.
    if (value && ts.isArrayLiteralExpression(value)) {
      const first = value.elements.find(ts.isObjectLiteralExpression);
      if (first) {
        for (const nested of objectLiteralKeys(first, `${path}[]`, depth + 1)) keys.add(nested);
      }
    }
  }
  return keys;
}

/** Members of a type literal / interface, following one level of nesting. */
function typeMemberKeys(node, sourceFile, prefix = "", depth = 0) {
  const keys = new Set();
  if (!node || depth > 2) return keys;

  const members = ts.isTypeLiteralNode(node) || ts.isInterfaceDeclaration(node) ? node.members : null;
  if (!members) return keys;

  for (const member of members) {
    if (!ts.isPropertySignature(member)) continue;
    const name = propertyName(member);
    if (!name) continue;
    const path = prefix ? `${prefix}.${name}` : name;
    keys.add(path);

    let type = member.type;
    if (type && ts.isUnionTypeNode(type)) {
      type = type.types.find((t) => t.kind !== ts.SyntaxKind.UndefinedKeyword) ?? type;
    }
    if (!type) continue;

    if (ts.isTypeLiteralNode(type)) {
      for (const nested of typeMemberKeys(type, sourceFile, path, depth + 1)) keys.add(nested);
    } else if (ts.isArrayTypeNode(type)) {
      const element = ts.isTypeLiteralNode(type.elementType)
        ? type.elementType
        : resolveTypeAlias(type.elementType, sourceFile);
      for (const nested of typeMemberKeys(element, sourceFile, `${path}[]`, depth + 1)) keys.add(nested);
    } else {
      const alias = resolveTypeAlias(type, sourceFile);
      if (alias) {
        for (const nested of typeMemberKeys(alias, sourceFile, path, depth + 1)) keys.add(nested);
      }
    }
  }
  return keys;
}

/** Follow `type Foo = {...}` / `interface Foo {...}` declared in the same file. */
function resolveTypeAlias(typeNode, sourceFile) {
  if (!typeNode || !ts.isTypeReferenceNode(typeNode) || !ts.isIdentifier(typeNode.typeName)) return null;
  const wanted = typeNode.typeName.text;
  let found = null;
  eachNode(sourceFile, (node) => {
    if (found) return;
    if (ts.isTypeAliasDeclaration(node) && node.name.text === wanted && ts.isTypeLiteralNode(node.type)) {
      found = node.type;
    }
    if (ts.isInterfaceDeclaration(node) && node.name.text === wanted) found = node;
  });
  return found;
}

/** The object literal a local `const NAME = {...}` is initialised with. */
function localObjectLiteral(sourceFile, name) {
  let found = null;
  eachNode(sourceFile, (node) => {
    if (found) return;
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || node.name.text !== name) return;
    let init = node.initializer;
    // `const X = {...} as const` / `satisfies Y`
    while (init && (ts.isAsExpression(init) || ts.isSatisfiesExpression(init))) init = init.expression;
    if (init && ts.isObjectLiteralExpression(init)) found = init;
  });
  return found;
}

/** Unwrap `EXPR as T` / `EXPR satisfies T` down to the underlying expression. */
function unwrap(expression) {
  let node = expression;
  while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node))) {
    node = node.expression;
  }
  return node;
}

function calleeName(call) {
  const expression = call.expression;
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

/**
 * Every `useCmsData(slug, FALLBACK)` call: the slug, the fallback's key set, and
 * the key paths the component actually reads off the returned value.
 */
export function findConsumers() {
  const consumers = [];

  for (const file of sourceFiles()) {
    const sourceFile = parse(file);

    eachNode(sourceFile, (node) => {
      if (!ts.isCallExpression(node) || calleeName(node) !== "useCmsData") return;
      const [slugArg, fallbackArg] = node.arguments;
      if (!slugArg || !ts.isStringLiteral(slugArg)) return;

      const fallback = unwrap(fallbackArg);
      let fallbackKeys = new Set();
      if (fallback && ts.isObjectLiteralExpression(fallback)) {
        fallbackKeys = objectLiteralKeys(fallback);
      } else if (fallback && ts.isIdentifier(fallback)) {
        const literal = localObjectLiteral(sourceFile, fallback.text);
        if (literal) fallbackKeys = objectLiteralKeys(literal);
      }

      consumers.push({
        slug: slugArg.text,
        file: relative(ROOT, file).replace(/\\/g, "/"),
        fallbackKeys,
        reads: collectReads(sourceFile, node),
      });
    });

    consumers.push(...loaderConsumers(sourceFile, file));
  }

  return consumers;
}

/**
 * Sections consumed by a route loader instead of by `useCmsData`.
 *
 * `head()` cannot await, so the landing page flattens the `seo` section inside
 * its loader (`data.cms["seo"]?.data`), and `/download` reads
 * `cms.download?.data` straight off the loader result. Both are real consumers;
 * only the access pattern differs. Detecting the pattern is what keeps those
 * two slugs under the same contract as everything else — the alternative was a
 * 17-key allowlist that silenced the section instead of checking it, which is
 * how `download.features` stayed dead.
 */
function loaderConsumers(sourceFile, file) {
  const found = [];

  eachNode(sourceFile, (node) => {
    if (!ts.isPropertyAccessExpression(node) || node.name.text !== "data") return;

    const owner = unwrap(node.expression);
    if (!owner) return;

    let slug = null;
    if (ts.isPropertyAccessExpression(owner) && isCmsBag(owner.expression)) {
      slug = owner.name.text;
    } else if (
      ts.isElementAccessExpression(owner) &&
      owner.argumentExpression &&
      ts.isStringLiteral(owner.argumentExpression) &&
      isCmsBag(owner.expression)
    ) {
      slug = owner.argumentExpression.text;
    }
    if (!slug) return;

    const alias = enclosingAlias(node);
    if (!alias) return;

    found.push({
      slug,
      file: relative(ROOT, file).replace(/\\/g, "/"),
      fallbackKeys: new Set(),
      reads: collectReadsFromRoot(sourceFile, alias),
    });
  });

  return found;
}

/** `cms`, `data.cms`, `loaderData.cms` — the bag of sections a loader returns. */
function isCmsBag(expression) {
  const base = unwrap(expression);
  if (!base) return false;
  if (ts.isIdentifier(base)) return base.text === "cms" || base.text === "cmsData";
  if (ts.isPropertyAccessExpression(base)) return base.name.text === "cms" || base.name.text === "cmsData";
  return false;
}

/**
 * The variable a section expression is assigned to, looking through the casts
 * and fallbacks these call sites are written with:
 * `const x: T = (cms.download?.data as T) ?? DEFAULTS;`
 */
function enclosingAlias(node) {
  let current = node.parent;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isSatisfiesExpression?.(current) ||
      ts.isBinaryExpression(current))
  ) {
    current = current.parent;
  }
  if (current && ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) return current.name.text;
  return null;
}

/**
 * Key paths read off a `useCmsData(...)` result.
 *
 * Handles `const cms = useCmsData(...)` followed by `cms.a`, `cms.a.b`,
 * `cms.items?.map(...)`, and destructuring at the call site. Reads through a
 * local alias (`const items = cms.items ?? []`) are followed one hop, which is
 * how most of these components are written.
 */
function collectReads(sourceFile, call) {
  const declaration = call.parent;
  const reads = new Set();
  if (!declaration || !ts.isVariableDeclaration(declaration)) return reads;

  if (ts.isObjectBindingPattern(declaration.name)) {
    for (const element of declaration.name.elements) {
      const name = element.propertyName ?? element.name;
      if (ts.isIdentifier(name)) reads.add(name.text);
    }
    return reads;
  }
  if (!ts.isIdentifier(declaration.name)) return reads;

  return collectReadsFromRoot(sourceFile, declaration.name.text);
}

/** The alias walk itself, shared by the `useCmsData` and loader call sites. */
function collectReadsFromRoot(sourceFile, rootName) {
  const reads = new Set();
  const roots = new Map([[rootName, ""]]);

  // Two passes so an alias declared after its first use is still followed.
  for (let pass = 0; pass < 2; pass++) {
    eachNode(sourceFile, (node) => {
      if (!ts.isPropertyAccessExpression(node)) return;
      const base = unwrapAccessBase(node.expression);
      if (!base || !ts.isIdentifier(base)) return;
      const prefix = roots.get(base.text);
      if (prefix === undefined) return;

      const path = prefix ? `${prefix}.${node.name.text}` : node.name.text;
      reads.add(path);

      // `const x = cms.foo` — treat later `x.bar` as a read of `cms.foo.bar`.
      const owner = node.parent;
      if (owner && ts.isVariableDeclaration(owner) && ts.isIdentifier(owner.name)) {
        roots.set(owner.name.text, path);
      }
      // `const x = cms.foo ?? []` / `cms.foo || []`
      if (owner && ts.isBinaryExpression(owner) && owner.parent && ts.isVariableDeclaration(owner.parent)) {
        const target = owner.parent.name;
        if (ts.isIdentifier(target)) roots.set(target.text, path);
      }
    });
  }

  return reads;
}

/** Strip `?.`, `!`, `(...)`, and `[0]` so `cms.items[0].label` still resolves. */
function unwrapAccessBase(expression) {
  let node = unwrap(expression);
  while (node && (ts.isNonNullExpression(node) || ts.isElementAccessExpression(node))) {
    node = unwrap(ts.isNonNullExpression(node) ? node.expression : node.expression);
  }
  return node;
}

/**
 * Every `useCmsSection<T>(slug, defaults)` call: the slug, the keys the editor
 * declares in `T`, and the keys its defaults literal writes.
 */
export function findEditors() {
  const editors = [];

  for (const file of sourceFiles()) {
    const sourceFile = parse(file);

    eachNode(sourceFile, (node) => {
      if (!ts.isCallExpression(node) || calleeName(node) !== "useCmsSection") return;
      const [slugArg, defaultsArg] = node.arguments;
      if (!slugArg || !ts.isStringLiteral(slugArg)) return;

      const typeArg = node.typeArguments?.[0];
      const declared = typeArg
        ? typeMemberKeys(
            ts.isTypeLiteralNode(typeArg) ? typeArg : resolveTypeAlias(typeArg, sourceFile),
            sourceFile,
          )
        : new Set();

      const defaults = unwrap(defaultsArg);
      let defaultKeys = new Set();
      if (defaults && ts.isObjectLiteralExpression(defaults)) {
        defaultKeys = objectLiteralKeys(defaults);
      } else if (defaults && ts.isIdentifier(defaults)) {
        const literal = localObjectLiteral(sourceFile, defaults.text);
        if (literal) defaultKeys = objectLiteralKeys(literal);
      }

      editors.push({
        slug: slugArg.text,
        file: relative(ROOT, file).replace(/\\/g, "/"),
        declaredKeys: declared,
        defaultKeys,
      });
    });
  }

  return editors;
}

/**
 * `CmsSectionSeeder::SECTIONS`, read out of PHP rather than re-typed here.
 *
 * The constant is a plain array, so composer's autoloader is enough — no
 * framework boot, no database. Returns null when PHP is unavailable, so the
 * gate test can still check the editor/component halves on a machine without
 * a CLI PHP (the JS side is the half that changes most often).
 */
export function seededSections() {
  const script = [
    'require "vendor/autoload.php";',
    "echo json_encode(Database\\Seeders\\CmsSectionSeeder::SECTIONS);",
  ].join(" ");

  let raw;
  try {
    raw = execFileSync("php", ["-r", script], {
      cwd: join(ROOT, "backend"),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return null;
  }

  const rows = JSON.parse(raw);
  const out = new Map();
  for (const row of rows) {
    out.set(row.section, {
      title: row.title,
      order: row.order,
      keys: jsonKeys(row.data ?? {}),
    });
  }
  return out;
}

/** Key paths of a decoded JSON object, in the same notation as the AST walkers. */
function jsonKeys(value, prefix = "", depth = 0) {
  const keys = new Set();
  if (depth > 2 || value === null || typeof value !== "object" || Array.isArray(value)) return keys;

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.add(path);
    if (Array.isArray(child)) {
      const first = child.find((item) => item && typeof item === "object" && !Array.isArray(item));
      if (first) for (const nested of jsonKeys(first, `${path}[]`, depth + 1)) keys.add(nested);
    } else if (child && typeof child === "object") {
      for (const nested of jsonKeys(child, path, depth + 1)) keys.add(nested);
    }
  }
  return keys;
}

const difference = (a, b) => [...a].filter((key) => !b.has(key)).sort();

/**
 * Sections whose `data` is deliberately not a flat key/value shape, so a key
 * diff says nothing useful about them.
 */
export const NON_SECTION_SLUGS = new Set([
  // Managed as list resources with their own tables and their own editors.
  "faqs",
  "testimonials",
]);

/**
 * Sections without a `useCmsSection` editor. They are CMS-controlled through
 * other mechanisms or rendered from bundled defaults only.
 */
export const ACCEPTED_NO_EDITOR = new Set([
  // about/careers/moments render bundled defaults; no CMS editor exists.
  "about",
  "careers",
  "moments",
]);

/**
 * Sections without any consumer. Empty on purpose: a section nothing reads is
 * the exact bug this script exists to catch, and the two slugs that used to sit
 * here (`seo`, `download`) are found properly now that loader access patterns
 * are detected.
 */
export const ACCEPTED_NO_CONSUMER = new Set([]);

/**
 * Divergences that are correct, each with the reason it is correct. Anything
 * not listed here is a bug: the gate test fails on it.
 *
 * Format: `"<slug>:<key>"`.
 */
export const ACCEPTED_DIVERGENCES = {
  // Read by the component from a sibling source, not from section data.
  unread: new Set([
    // The announcement bar's own on/off lives in `data.enabled` for historical
    // reasons; the section-level `enabled` flag is what the UI toggles now.
    "announcement:enabled",
    // `navigation.cta` and `navigation.logo` were removed from the editor.
    // Seeded values linger in the DB row but nothing writes them any more.
    "navigation:cta", "navigation:logo",
  ]),
  unmanaged: new Set([
    // `announcement.enabled` is read by the component but is a data-level
    // flag, not something the editor writes into its `data` object (the
    // section-level switch does the job).
    "announcement:enabled",
  ]),
};

/**
 * Audit every section that has both an editor and a public consumer.
 *
 * Two findings matter, and they are different bugs:
 *
 *   `unread`    — the editor writes it, no component reads it. The save works,
 *                 the DB changes, the page never moves. This is the one that
 *                 makes an administrator think the CMS is broken.
 *   `unmanaged` — a component reads it, no editor writes it. The copy is frozen
 *                 at whatever the fallback or the seed says, and there is no
 *                 way to change it from the admin panel.
 *
 * Seeded keys are checked the same way: a seeded key no component reads is
 * content sitting in the database that never reaches a page.
 */
export function auditCmsContract() {
  const editors = findEditors();
  const consumers = findConsumers();
  const seeded = seededSections();
  // No PHP on the machine means no seed keys, not "every section lost its seed
  // row". Without this the gate test would fail on any box without a PHP
  // binary, which is the definition of a flaky gate.
  const phpAvailable = seeded !== null;

  const slugs = new Set([
    ...editors.map((editor) => editor.slug),
    ...consumers.map((consumer) => consumer.slug),
    ...(seeded ? seeded.keys() : []),
  ]);

  const sections = [];

  for (const slug of [...slugs].sort()) {
    if (NON_SECTION_SLUGS.has(slug)) continue;

    const editor = editors.find((candidate) => candidate.slug === slug) ?? null;
    const slugConsumers = consumers.filter((candidate) => candidate.slug === slug);
    const seed = seeded?.get(slug) ?? null;

    // A key is "read" if any consumer of the slug reads it, and "offered" if the
    // component's own fallback declares it — a fallback key the component never
    // renders is dead weight, not a contract.
    const read = union(slugConsumers.map((consumer) => consumer.reads));
    const fallback = union(slugConsumers.map((consumer) => consumer.fallbackKeys));
    const written = editor ? union([editor.declaredKeys, editor.defaultKeys]) : new Set();

    const topLevel = (keys) => new Set([...keys].filter((key) => !key.includes(".") && !key.includes("[")));

    /**
     * Nested object fields (`webApp.label`), excluding list-item shapes
     * (`items[].title`), which depend on how a child component destructures its
     * props and say nothing about the contract.
     *
     * Only checked when the parent object is read at all: if nothing reads
     * `webApp`, the top-level `unread` finding already says so, and repeating
     * every child of it is noise.
     */
    const nested = (keys, parents) =>
      new Set(
        [...keys].filter(
          (key) => key.includes(".") && !key.includes("[") && parents.has(key.slice(0, key.indexOf("."))),
        ),
      );

    sections.push({
      slug,
      editorFile: editor?.file ?? null,
      consumerFiles: slugConsumers.map((consumer) => consumer.file),
      seeded: Boolean(seed),
      written: [...written].sort(),
      read: [...read].sort(),
      fallback: [...fallback].sort(),
      seedKeys: seed ? [...seed.keys].sort() : [],
      // Compare top-level keys only. Nested paths depend on how a component
      // happens to destructure, which is style, not contract.
      //
      // The comparison is against what a component *reads*, never against what
      // its fallback object merely declares. A fallback key the component never
      // renders is the same dead field as one it never declares: `footer` typed
      // and defaulted `copyright`, the editor offered the input, the DB stored
      // the value, and the bottom bar rendered a hardcoded sentence instead.
      unread: difference(topLevel(written), read).filter(
        (key) => !ACCEPTED_DIVERGENCES.unread.has(`${slug}:${key}`),
      ),
      unmanaged: editor
        ? difference(topLevel(read), written).filter(
            (key) => !ACCEPTED_DIVERGENCES.unmanaged.has(`${slug}:${key}`),
          )
        : [],
      // Same bug one level down: the editor offers "Web app button label", the
      // page renders its own hardcoded string, and the saved value is dead.
      nestedUnread: difference(nested(written, topLevel(read)), read).filter(
        (key) => !ACCEPTED_DIVERGENCES.unread.has(`${slug}:${key}`),
      ),
      seededButUnread: seed
        ? difference(topLevel(seed.keys), read).filter(
            (key) => !ACCEPTED_DIVERGENCES.unread.has(`${slug}:${key}`),
          )
        : [],
      // A section with an editor but no seed row starts life as a synthetic
      // empty row; with a consumer but no editor it can never be edited.
      missingEditor: !editor && slugConsumers.length > 0 && !ACCEPTED_NO_EDITOR.has(slug),
      missingConsumer: Boolean(editor) && slugConsumers.length === 0 && !ACCEPTED_NO_CONSUMER.has(slug),
      missingSeed: phpAvailable && !seed && Boolean(editor),
    });
  }

  return { sections, phpAvailable };
}

function union(sets) {
  const out = new Set();
  for (const set of sets) for (const key of set) out.add(key);
  return out;
}

/**
 * Every contract violation in one section, as human-readable lines.
 *
 * The report, the CLI exit code, and the vitest gate all call this, so a new
 * finding cannot be added to the audit and forgotten by the gate. That is not a
 * hypothetical: `nestedUnread` printed FAIL while the CLI still exited 0,
 * because the exit-code check listed its fields by hand.
 */
export function sectionIssues(section) {
  const issues = [];
  if (section.unread.length) issues.push(`editor writes, nothing reads: ${section.unread.join(", ")}`);
  if (section.nestedUnread.length)
    issues.push(`editor writes nested field, nothing reads: ${section.nestedUnread.join(", ")}`);
  if (section.unmanaged.length) issues.push(`page reads, no editor writes: ${section.unmanaged.join(", ")}`);
  if (section.seededButUnread.length) issues.push(`seeded, nothing reads: ${section.seededButUnread.join(", ")}`);
  if (section.missingEditor) issues.push("no admin editor");
  if (section.missingSeed) issues.push("no seed row");
  if (section.missingConsumer) issues.push("no public consumer");
  return issues;
}

export function formatReport({ sections, phpAvailable }) {
  const lines = [];
  lines.push("CMS contract audit");
  lines.push("==================");
  if (!phpAvailable) lines.push("! PHP unavailable — seed keys were not checked.");

  let problems = 0;

  for (const section of sections) {
    const issues = sectionIssues(section);

    problems += issues.length;
    lines.push("");
    lines.push(`${issues.length ? "FAIL" : "ok  "}  ${section.slug}`);
    lines.push(`      editor:   ${section.editorFile ?? "(none)"}`);
    lines.push(`      renders:  ${section.consumerFiles.join(", ") || "(none)"}`);
    for (const issue of issues) lines.push(`      ! ${issue}`);
  }

  lines.push("");
  lines.push(`${sections.length} sections, ${problems} problem(s).`);
  return lines.join("\n");
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.dirname, "cms-contract.mjs");

if (invokedDirectly) {
  const result = auditCmsContract();
  console.log(formatReport(result));
  process.exitCode = result.sections.flatMap(sectionIssues).length > 0 ? 1 : 0;
}
