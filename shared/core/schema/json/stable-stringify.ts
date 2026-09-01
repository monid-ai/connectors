/**
 * stableStringify — same value ⇒ same bytes, which content hashing requires.
 * Backed by the `canonicalize` npm package (the reference RFC 8785 / JCS
 * implementation: object members sorted by code-unit order, fixed number
 * formatting, no insignificant whitespace) — replaces the earlier
 * hand-rolled sorted-key serializer.
 */
import canonicalizeModule from "canonicalize";
import type { Json } from "./type.ts";

// CJS interop: the package exports the function directly.
// deno-lint-ignore no-explicit-any
const canonicalizeJson =
    ((canonicalizeModule as any).default ?? canonicalizeModule) as (
        value: unknown,
    ) => string | undefined;

export function stableStringify(value: Json): string {
    const result = canonicalizeJson(value);
    if (result === undefined) {
        throw new Error("stableStringify: value is not serializable JSON");
    }
    return result;
}

export async function sha256Hex(text: string): Promise<string> {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(text),
    );
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

/** Content key for fn sources: `sha256:<hex>` over the NORMALIZED source text. */
export async function fnKey(normalizedSrc: string): Promise<string> {
    return `sha256:${await sha256Hex(normalizedSrc)}`;
}

/**
 * Doc hash: sha256 over the stable serialization of the doc with its own
 * `hash` field removed. Covers `$fn` keys, so a doc pins its code content.
 */
export async function docHash(doc: Record<string, Json>): Promise<string> {
    const { hash: _hash, ...rest } = doc;
    return `sha256:${await sha256Hex(stableStringify(rest as Json))}`;
}
