import { z } from "zod";

/**
 * POST /v1/run body (bowmark.ai/docs, 2026-10-10). Mirror carries
 * optionality only (D25); the binding requires `script`.
 */
export const zBowmarkRunBody = z.object({
    script: z.string().describe(
        "A plain async JavaScript body (not a wrapping function) " +
            "written against the `bowmark` global, using the exact " +
            "names Bowmark /library returned. `return` the value you " +
            "want back; `log(...)` for progress lines. Built-ins plus " +
            "URL/URLSearchParams exist; fetch, import, setTimeout and a " +
            "filesystem do not: `bowmark` is the only I/O. Run several " +
            "calls together with Promise.allSettled, never one after " +
            "another. Example: `const { flights } = await " +
            "bowmark.flights.search({ from: 'SFO', to: 'JFK', depart: " +
            "'2026-11-02' }); return flights.slice(0, 5);`",
    ).optional(),
}).strict();
