import { describe, expect, it } from "vitest";
import {
  ACCEPTED_DIVERGENCES,
  ACCEPTED_NO_CONSUMER,
  auditCmsContract,
  formatReport,
  sectionIssues,
} from "../../../scripts/cms-contract.mjs";

/**
 * The gate for the bug that started this whole audit: an administrator edits a
 * field, the save succeeds, the row changes in the database, and the public page
 * does not move — because no component ever reads that key.
 *
 * Comparing key sets across the editor, the renderer and the seeder is
 * same-input-same-output work, so it lives in a script and this test just holds
 * it to zero. Adding a field to an admin editor and forgetting to render it now
 * fails the suite instead of shipping as dead weight.
 *
 * The audit parses the real source files with the TypeScript compiler and reads
 * the real `CmsSectionSeeder::SECTIONS` constant through `php -r`, so it needs
 * no database and no dev server, and it cannot drift from what ships.
 */
describe("CMS contract", () => {
  const result = auditCmsContract();

  it("finds the sections it is supposed to audit", () => {
    // A parser change that quietly stopped finding editors or consumers would
    // make every other assertion here pass vacuously.
    expect(result.sections.length).toBeGreaterThanOrEqual(17);

    const withEditor = result.sections.filter((section) => section.editorFile);
    const withConsumer = result.sections.filter((section) => section.consumerFiles.length > 0);
    expect(withEditor.length).toBeGreaterThanOrEqual(14);
    expect(withConsumer.length).toBeGreaterThanOrEqual(17);
  });

  it("has no section the admin panel can write but the site never reads", () => {
    const offenders = result.sections
      .filter((section) => section.unread.length || section.nestedUnread.length)
      .map((section) => `${section.slug}: ${[...section.unread, ...section.nestedUnread].join(", ")}`);

    expect(offenders).toEqual([]);
  });

  it("has no section the site renders that the admin panel cannot edit", () => {
    const offenders = result.sections
      .filter((section) => section.unmanaged.length)
      .map((section) => `${section.slug}: ${section.unmanaged.join(", ")}`);

    expect(offenders).toEqual([]);
  });

  it("has no seeded content that never reaches a page", () => {
    if (!result.phpAvailable) return; // No php binary: seed keys were not collected.

    const offenders = result.sections
      .filter((section) => section.seededButUnread.length)
      .map((section) => `${section.slug}: ${section.seededButUnread.join(", ")}`);

    expect(offenders).toEqual([]);
  });

  it("gives every rendered section an editor and every editor a seed row", () => {
    expect(result.sections.filter((section) => section.missingEditor).map((s) => s.slug)).toEqual([]);
    expect(result.sections.filter((section) => section.missingConsumer).map((s) => s.slug)).toEqual([]);
    if (result.phpAvailable) {
      expect(result.sections.filter((section) => section.missingSeed).map((s) => s.slug)).toEqual([]);
    }
  });

  it("reports zero problems overall", () => {
    const issues = result.sections.flatMap((section) =>
      sectionIssues(section).map((issue) => `${section.slug}: ${issue}`),
    );

    // Print the report on failure: the list of slugs alone does not say which
    // key drifted, and this is the test someone will hit months from now.
    expect(issues, `\n${formatReport(result)}`).toEqual([]);
  });

  it("keeps the escape hatches empty or justified", () => {
    // `ACCEPTED_NO_CONSUMER` silences a whole slug, which is how
    // `download.features` stayed dead for as long as it did. It must stay empty.
    expect([...ACCEPTED_NO_CONSUMER]).toEqual([]);

    // Per-key exceptions are allowed but must stay small and deliberate; each
    // one is commented in the script with the reason it is correct.
    expect(ACCEPTED_DIVERGENCES.unread.size).toBeLessThanOrEqual(4);
    expect(ACCEPTED_DIVERGENCES.unmanaged.size).toBeLessThanOrEqual(2);
  });

  it("checks the seeder, not just the frontend", () => {
    // A missing php binary is allowed to skip seed comparison, but it must not
    // silently skip on the machine that ships the code.
    if (!result.phpAvailable) {
      console.warn("cms-contract: php not found, seed keys were not verified");
      return;
    }

    const seededSlugs = result.sections.filter((section) => section.seeded).map((section) => section.slug);
    expect(seededSlugs).toContain("hero");
    expect(seededSlugs).toContain("download");
    expect(seededSlugs).toContain("footer");
  });
});
