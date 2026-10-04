import { z } from "zod";

/**
 * conserving_celerytop/package-registry-metadata-api: dataset ITEM schema.
 * The actor publishes its dataset fields only as a table VIEW
 * (storages.dataset.views.overview) and leaves storages.dataset.fields empty,
 * so this schema is curated by hand from the view's fields plus the items of
 * one real run on 2026-10-04 (6 rows: npm, PyPI and crates.io). Passthrough
 * DOCUMENTATION (design D29): non-strict, every field optional, so output
 * validation can never fail a paid run over vendor drift.
 */
export const zPackageRegistryMetadataApiOutputItem = z.object({
    registry: z.any().describe(
        "Registry the row came from: npm, pypi or crates",
    )
        .optional(),
    name: z.any().describe("Package name as the registry spells it").optional(),
    inputName: z.any().describe("The name as it was given in the input")
        .optional(),
    status: z.any().describe(
        "Row status: ok, not_found, or an error status when the registry did not answer",
    ).optional(),
    message: z.any().describe("Explanation for a row that is not ok, else null")
        .optional(),
    url: z.any().describe("Link to the package page on its registry")
        .optional(),
    latestVersion: z.any().describe("Latest published version").optional(),
    latestReleaseDate: z.any().describe("ISO timestamp of the latest release")
        .optional(),
    firstReleaseDate: z.any().describe("ISO timestamp of the first release")
        .optional(),
    versionCount: z.any().describe("Number of published versions").optional(),
    license: z.any().describe("License of the latest version").optional(),
    description: z.any().describe("Short package description").optional(),
    keywords: z.array(z.string()).describe("Registry keywords").optional(),
    homepageUrl: z.any().describe("Project homepage").optional(),
    repositoryUrl: z.any().describe("Source repository link").optional(),
    documentationUrl: z.any().describe("Documentation link, else null")
        .optional(),
    deprecated: z.any().describe("Whether the package is marked deprecated")
        .optional(),
    deprecationMessage: z.any().describe("Deprecation notice, else null")
        .optional(),
    runtimeRequirement: z.any().describe(
        "Runtime the latest version needs, for example node >= 18",
    ).optional(),
    packageSizeBytes: z.any().describe("Size of the latest release in bytes")
        .optional(),
    downloadsWeekly: z.any().describe("Downloads in the last 7 days, else null")
        .optional(),
    downloadsMonthly: z.any().describe(
        "Downloads in the last 30 days, else null",
    ).optional(),
    downloadsLast90Days: z.any().describe(
        "Downloads in the last 90 days, else null",
    ).optional(),
    downloadsTotal: z.any().describe("All-time downloads, else null")
        .optional(),
    dependentsCount: z.any().describe(
        "Packages that depend on this one, else null",
    )
        .optional(),
    dependencyCount: z.any().describe("Number of runtime dependencies")
        .optional(),
    optionalDependencyCount: z.any().describe(
        "Number of optional dependencies",
    ).optional(),
    devDependencyCount: z.any().describe(
        "Number of development dependencies, else null",
    ).optional(),
    peerDependencyCount: z.any().describe(
        "Number of peer dependencies, else null",
    ).optional(),
    dependencies: z.array(z.record(z.string(), z.any())).describe(
        "Dependency list with name, range, kind and condition",
    ).optional(),
    sourceUrl: z.any().describe("Registry API URL the row was read from")
        .optional(),
    fetchedAt: z.any().describe("ISO timestamp of the lookup").optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object, so validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zPackageRegistryMetadataApiOutput = z.array(
    zPackageRegistryMetadataApiOutputItem.or(z.record(z.string(), z.unknown())),
);
