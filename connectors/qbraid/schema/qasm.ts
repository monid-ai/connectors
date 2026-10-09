import { z } from "zod";

/** `{qasm}` — the body of /composer/parse, /validate and /simulate
 *  (qbraid-api composer/validators.ts `qasmString`: 1..500 000 chars). */
export const zQasmBody = z.object({
    qasm: z.string().min(1).max(500_000).describe(
        "OpenQASM 2.0 or 3.0 program source.",
    ),
});
