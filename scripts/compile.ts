/**
 * deno task compiler:compile [--force] [--frozen-meta]
 *
 * Compiles ALL connector Defs into the flat bundle (docs + fnTable) under
 * the gitignored .output/ cache — always the whole repo, one artifact
 * (provider/endpoint lookups read the compiled bundle; design D28). CI
 * uploads .output/catalog.json as the release artifact; nothing compiled is
 * checked in.
 */
import { Command } from "@cliffy/command";
import { compileToOutput } from "./lib.ts";

const { options } = await new Command()
    .name("compiler:compile")
    .description(
        "Compile all connector defs into the bundle (cached under .output/).",
    )
    .option("--force", "Ignore the cache.")
    .option(
        "--frozen-meta",
        "Pin catalogVersion/generatedAt (CI determinism compare).",
    )
    .parse(Deno.args);

const { bundle, outputPath, cacheHit } = await compileToOutput({
    force: options.force,
    frozenMeta: options.frozenMeta,
});

console.log(
    `${cacheHit ? "cache hit" : "compiled"}: ${outputPath}\n` +
        `  minEngineVersion: ${bundle.minEngineVersion}\n` +
        `  providers: ${Object.keys(bundle.providers).join(", ")}\n` +
        `  endpoints: ${Object.keys(bundle.endpoints).join(", ")}\n` +
        `  fnTable entries: ${Object.keys(bundle.fnTable).length}`,
);
