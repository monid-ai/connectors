import { auth } from "./auth.ts";
import { usage } from "./usage.ts";

/**
 * The preset namespace — package-qualified at the import site:
 *   import { presets } from "@shared/core";
 *   presets.auth.header("x-api-key") · presets.usage.perCall()
 *
 * SCOPE (design D23): presets exist ONLY for provider-seam slots where no
 * doc-local typing is lost — auth injection (credentials aren't schema-typed
 * per doc) and the canonical flat settle (`usage.perCall`, always
 * `{counts: {}}` — no typing hole by construction). Estimate presets were
 * DELETED: their field args were unchecked strings and their portable ctx
 * erased the body typing — a typed inline fn on the doc IS the typed
 * preset (exact input type in, exact model keys out).
 */
export const presets = { auth, usage } as const;
