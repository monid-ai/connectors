import { z } from "zod";
import { zProviderName } from "../common/ids.ts";
import { zProviderMeta } from "../meta/provider.ts";
import {
    zAuthSection,
    zInputSection,
    zOutputSection,
    zRequestDefaults,
    zTimeoutsSection,
    zUsageSection,
} from "../sections/mod.ts";

/**
 * zProviderDef — the provider is the DEFAULTS LAYER: every section here uses
 * the SAME schema as the endpoint's (sections/), sits FLAT (no `defaults:`
 * wrapper — the composition rule is keyed on the field, not on nesting), and
 * resolves leaf-wise with the endpoint's value winning:
 *
 *     endpoint ?? provider ?? config default
 *
 * That includes hooks (endpoint toRequest/fromResponse REPLACES the
 * provider's) and meta leaves (endpoint docsUrl/categories fall back to the
 * provider's). The compiler enforces that url, auth.inject, and
 * usage.consolidate resolve somewhere.
 */
export const zProviderDef = z.strictObject({
    /** Must equal the connector folder name (loader-enforced). */
    name: zProviderName,
    meta: zProviderMeta,
    request: zRequestDefaults.optional(),
    input: zInputSection.optional(),
    output: zOutputSection.optional(),
    usage: zUsageSection.optional(),
    auth: zAuthSection.optional(),
    timeouts: zTimeoutsSection.optional(),
});

export type ProviderDefSeed = z.input<typeof zProviderDef>;
export type ProviderDef = z.output<typeof zProviderDef>;
