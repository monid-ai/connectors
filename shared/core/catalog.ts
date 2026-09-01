import type { Bundle } from "./schema/bundle/bundle.ts";
import type { EndpointDoc } from "./schema/endpoint/doc.ts";
import type { LeafCategory } from "./schema/taxonomy/leaf.ts";
import type { ProviderMeta } from "./schema/meta/provider.ts";

/**
 * Bundle read API — pure functions over the Bundle shape core defines (no
 * engine, no compiler). Simple by design: listings spread the existing
 * shapes + a count; inspect returns the doc itself (it IS the contract).
 * Surfaced by `deno task catalog …`.
 */

function endpointsOf(bundle: Bundle, provider: string): EndpointDoc[] {
    return Object.values(bundle.endpoints).filter((doc) =>
        doc.provider === provider
    );
}

export function listProviders(
    bundle: Bundle,
): (ProviderMeta & { name: string; endpointCount: number })[] {
    return Object.keys(bundle.providers).sort().map((name) => ({
        ...bundle.providers[name].meta,
        name,
        endpointCount: endpointsOf(bundle, name).length,
    }));
}

export interface EndpointFilter {
    provider?: string;
    category?: string;
}

export function listEndpoints(
    bundle: Bundle,
    filter: EndpointFilter = {},
): {
    id: string;
    displayName: string;
    summary: string;
    categories: string[];
}[] {
    return Object.keys(bundle.endpoints).sort()
        .map((id) => bundle.endpoints[id])
        .filter((doc) =>
            filter.provider === undefined || doc.provider === filter.provider
        )
        .filter((doc) =>
            filter.category === undefined ||
            (doc.meta.categories ?? []).includes(filter.category)
        )
        .map((doc) => ({
            id: doc.id,
            displayName: doc.meta.displayName,
            summary: doc.meta.summary,
            categories: doc.meta.categories ?? [],
        }));
}

export function listCategories(
    bundle: Bundle,
): (LeafCategory & { endpointCount: number })[] {
    return bundle.taxonomy.leaves.map((leaf) => ({
        ...leaf,
        endpointCount: bundle.taxonomy.membership[leaf.id]?.length ?? 0,
    }));
}

/** The doc IS the endpoint's contract — return it as-is. */
export function inspectEndpoint(
    bundle: Bundle,
    endpointId: string,
): EndpointDoc {
    const doc = bundle.endpoints[endpointId];
    if (!doc) throw new Error(`endpoint not in bundle: ${endpointId}`);
    return doc;
}
