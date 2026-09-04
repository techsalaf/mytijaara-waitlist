/**
 * Types for `cms-contract.mjs`.
 *
 * The script itself stays plain ESM so it runs with bare `node` in a cPanel
 * shell or a pre-commit hook, with no build step and no ts-node. This file is
 * what lets `src/lib/cms/contract.test.ts` import it under `strict` without a
 * `@ts-expect-error`, and it doubles as the written contract of what the audit
 * reports.
 */

/** One CMS section, compared across its editor, its consumers, and the seeder. */
export type CmsContractSection = {
  slug: string;
  /** Admin editor route that calls `useCmsSection(slug, …)`, if one exists. */
  editorFile: string | null;
  /** Public files that read the section, via `useCmsData` or a route loader. */
  consumerFiles: string[];
  seeded: boolean;
  /** Keys the editor types or defaults, so keys it can write to the database. */
  written: string[];
  /** Keys a consumer actually renders. */
  read: string[];
  /** Keys a consumer's bundled fallback declares, rendered or not. */
  fallback: string[];
  seedKeys: string[];
  /** Editor writes it, nothing renders it: saves that never move the page. */
  unread: string[];
  /** A page renders it, no editor writes it: copy frozen at the fallback. */
  unmanaged: string[];
  /** Same as `unread`, one level into an object (`webApp.label`). */
  nestedUnread: string[];
  /** Seeded content sitting in the database that never reaches a page. */
  seededButUnread: string[];
  missingEditor: boolean;
  missingConsumer: boolean;
  missingSeed: boolean;
};

export type CmsContractResult = {
  sections: CmsContractSection[];
  /** False when no `php` binary was found, so seed keys were not checked. */
  phpAvailable: boolean;
};

export function auditCmsContract(): CmsContractResult;

/** Every violation in one section, as human-readable lines. Empty means clean. */
export function sectionIssues(section: CmsContractSection): string[];

export function formatReport(result: CmsContractResult): string;

export const NON_SECTION_SLUGS: Set<string>;
export const ACCEPTED_NO_EDITOR: Set<string>;
export const ACCEPTED_NO_CONSUMER: Set<string>;
export const ACCEPTED_DIVERGENCES: { unread: Set<string>; unmanaged: Set<string> };
