import { transform } from "./transform.ts";
import { auth } from "./auth.ts";
import { usage } from "./usage.ts";

/**
 * The preset namespace — package-qualified at the import site:
 *   import { presets } from "@shared/core";
 *   presets.auth.header("x-api-key") · presets.transform.strip([...]) · presets.usage.perCall()
 */
export const presets = { transform, auth, usage } as const;
