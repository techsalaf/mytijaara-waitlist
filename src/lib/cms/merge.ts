/**
 * Merging admin-saved CMS section data over a bundled default object.
 *
 * Shared by the public renderer (`useCmsData`) and the admin editor
 * (`useCmsSection`) on purpose: if the two disagreed about what a stored row
 * means, the admin panel would show one thing and the site another, which is the
 * class of bug this whole area keeps producing.
 */

/**
 * Copy `saved` over `fallback`, key by key.
 *
 * Plain objects merge recursively, so a row written before a field existed keeps
 * the new field's default instead of the editor showing it blank. Arrays and
 * scalars replace wholesale: a five-item list edited down to three must become
 * three items, not three overlaid on the old five, and an intentionally emptied
 * list must stay empty.
 *
 * Keys present in `saved` but absent from `fallback` survive. That is deliberate
 * for the editor: `navigation.cta` and `navigation.logo` still sit in seeded rows
 * that no editor field writes any more, and a save must not silently delete
 * stored content the current editor happens not to know about.
 */
export function mergeSectionData<T extends Record<string, unknown>>(
  fallback: T,
  saved: Record<string, unknown>,
): T {
  const out: Record<string, unknown> = { ...fallback };
  for (const [key, value] of Object.entries(saved)) {
    const base = out[key];
    if (isPlainObject(base) && isPlainObject(value)) {
      out[key] = mergeSectionData(base, value);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
