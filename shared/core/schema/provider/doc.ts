import { z } from "zod";
import { contractConfig } from "../../config.ts";
import { zDocHash, zProviderName, zSemverString } from "../common/ids.ts";
import { zProviderMeta } from "../meta/provider.ts";

/**
 * zProviderDoc — the provider's identity + display info, and NOTHING
 * derivable:
 *   - no endpoint index (select on `endpointDoc.provider` — the bundle's
 *     endpoints map makes that trivial; an embedded index could silently
 *     drift);
 *   - no credentials copy (every EndpointDoc carries the fused
 *     `auth.credentials`; a provider-level copy goes stale the moment an
 *     endpoint overrides).
 * Provider meta is never copied into endpoints (only the docsUrl/categories
 * leaves fall back at compile).
 */
export const zProviderDoc = z.strictObject({
    specVersion: z.literal(contractConfig.schema.specVersion),
    name: zProviderName,
    /** Max over this provider's endpoints. */
    minEngineVersion: zSemverString,
    meta: zProviderMeta,
    hash: zDocHash,
});
export type ProviderDoc = z.infer<typeof zProviderDoc>;
