/**
 * deno task engine:run <provider>#<endpoint> --body '<json>' [--query '<json>']
 *                      [--path-params '<json>'] [--input '<json RunInput>']
 *
 * JIT: compile (or reuse the .output/ cache), build the sealed unit, execute
 * it through Engine.load with directTransport (credentials from env
 * <NAME>_API_KEY), print the result including usage. `--input` is the
 * full-RunInput escape hatch; the named flags compose one.
 * (Catalog listing/inspection lives in `deno task catalog`.)
 */
import { Command } from "@cliffy/command";
import { type Json, type RunInput, sealUnit } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import { compileToOutput } from "./lib.ts";

function parseJson(flag: string, raw: string): Json {
    try {
        return JSON.parse(raw) as Json;
    } catch (error) {
        throw new Error(`${flag} is not valid JSON: ${error}`);
    }
}

const { options, args } = await new Command()
    .name("engine:run")
    .description(
        "Compile (cached) and execute one endpoint with env credentials.",
    )
    .arguments("<endpoint:string>")
    .option("--body <json:string>", "Request body (JSON).")
    .option("--query <json:string>", "Query params (JSON object).")
    .option("--path-params <json:string>", "Path params (JSON object).")
    .option(
        "--input <json:string>",
        "Full RunInput (escape hatch; named flags override).",
    )
    .parse(Deno.args);

const endpointId = args[0];

let input: RunInput = {};
if (options.input !== undefined) {
    const full = parseJson("--input", options.input);
    // a bare object without the trio keys is treated as the body
    input = full !== null && typeof full === "object" && !Array.isArray(full) &&
            ("body" in full || "queryParams" in full || "pathParams" in full)
        ? full as RunInput
        : { body: full };
}
if (options.body !== undefined) {
    input = { ...input, body: parseJson("--body", options.body) };
}
if (options.query !== undefined) {
    input = {
        ...input,
        queryParams: parseJson(
            "--query",
            options.query,
        ) as RunInput["queryParams"],
    };
}
if (options.pathParams !== undefined) {
    input = {
        ...input,
        pathParams: parseJson(
            "--path-params",
            options.pathParams,
        ) as RunInput["pathParams"],
    };
}

const { bundle, cacheHit } = await compileToOutput();
console.error(
    `[engine:run] ${
        cacheHit ? "cache hit" : "compiled"
    } — loading ${endpointId}`,
);

const unit = sealUnit(bundle, endpointId);
const engine = new Engine({ transport: directTransport() });
const loaded = await engine.load(unit);
const result = await loaded.run(input);

console.log(JSON.stringify(result, null, 2));
if (result.isProviderError) Deno.exit(1);
