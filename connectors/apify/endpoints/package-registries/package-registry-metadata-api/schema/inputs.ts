import { z } from "zod";

/**
 * conserving_celerytop/package-registry-metadata-api: actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/conserving_celerytop~package-registry-metadata-api/builds/default →
 * actorDefinition.input) on 2026-10-04 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence, see deno task drift). Non-strict by policy: the actor
 * accepts supersets, so unknown fields pass through.
 */
export const zPackageRegistryMetadataApiBody = z.object({
    packageNames: z.array(z.string()).max(1000).describe(
        "Add one package name per entry, for example express or @types/node. Put npm:, pypi: or crates: in front of a name to choose its registry, for example pypi:requests. Names without a prefix use the registries chosen under Advanced options.",
    ).optional(),
    searchQuery: z.string().max(100).describe(
        "Type a keyword to find packages on npm and crates.io, for example http client. Found packages are added after the names you listed.",
    ).optional(),
    maxItems: z.number().int().min(1).max(1000).describe(
        "Set how many package rows to save, from 1 to 1,000. Each saved row is one charged record, and a name that is not found is one row.",
    ).optional(),
    registries: z.array(z.enum(["npm", "pypi", "crates"])).describe(
        "Choose the registries for names without a prefix and for search text. A name is looked up once in every chosen registry.",
    ).optional(),
});
