import { z } from "zod";

export const zProviderName = z.string().regex(
    /^[a-z0-9][a-z0-9-]*$/,
    "provider name must be lowercase kebab-case",
);
export type ProviderName = z.infer<typeof zProviderName>;

export const zEndpointName = z.string().regex(
    /^[a-z0-9][a-z0-9-]*$/,
    "endpoint name must be lowercase kebab-case",
);
export type EndpointName = z.infer<typeof zEndpointName>;

/** "<provider>#<endpoint>" — always INFERRED from folders, never authored. */
export const zEndpointId = z.string().regex(
    /^[a-z0-9][a-z0-9-]*#[a-z0-9][a-z0-9-]*$/,
    "endpoint id must be <provider>#<endpoint>",
);
export type EndpointId = z.infer<typeof zEndpointId>;

/** Single-segment LEAF category slug (flat namespace, v1-compatible). */
export const zCategoryId = z.string().regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'category must be a single lowercase slug id like "web-search"',
);
export type CategoryId = z.infer<typeof zCategoryId>;

export const zSemverString = z.string().regex(
    /^\d+\.\d+\.\d+$/,
    "must be a plain semver (MAJOR.MINOR.PATCH)",
);
export type SemverString = z.infer<typeof zSemverString>;

/**
 * Content ids/hashes are ALGORITHM-AGNOSTIC by NAME (like zProviderName /
 * zEndpointId): the `sha256:` prefix in the VALUE is the migration mechanism
 * — a future `blake3:<hex>` id would validate under the same interface
 * without renaming anything. Today both accept sha256 only.
 */
export const zFnId = z.string().regex(
    /^sha256:[0-9a-f]{64}$/,
    "fn id must be <algorithm>:<hex> (currently sha256:<64 hex>)",
);
export type FnId = z.infer<typeof zFnId>;

export const zDocHash = z.string().regex(
    /^sha256:[0-9a-f]{64}$/,
    "doc hash must be <algorithm>:<hex> (currently sha256:<64 hex>)",
);
export type DocHash = z.infer<typeof zDocHash>;
