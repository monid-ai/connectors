import { z } from "zod";

/** POST /composer/convert body — qbraid-api composer/validators.ts
 *  `ConvertQasmSchema` (snake_case `target_version` is the wire name). */
export const zConvertQasmBody = z.object({
    qasm: z.string().min(1).max(500_000).describe(
        "OpenQASM 2.0 or 3.0 program source.",
    ),
    target_version: z.enum(["2.0", "3.0"]).describe(
        "OpenQASM version to convert to.",
    ),
});
