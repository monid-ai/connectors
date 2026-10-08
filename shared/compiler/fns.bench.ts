import { FnInterner } from "./fns.ts";
import { preset } from "@shared/core";

// Run on each revision with `deno bench --allow-read --allow-env shared/compiler/fns.bench.ts`.
// This is a shared-source microbenchmark, not a whole-catalog speedup claim.
const factory = preset("bench.identity", (value: number) => () => value);
const fns = Array.from({ length: 2000 }, (_, i) => factory(i));
Deno.bench(
    "FnInterner: 2000 references sharing one factory source",
    async () => {
        const interner = new FnInterner();
        for (const fn of fns) await interner.intern(fn, "bench", "0.1.0");
    },
);
