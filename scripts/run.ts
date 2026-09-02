/**
 * deno task engine:run <provider>#<endpoint> [--body '<json>']
 *                      [--query-params '<json>'] [--path-params '<json>']
 *
 * JIT: compile (or reuse the .output/ cache), pick the endpoint from the
 * bundle (sealUnit), execute it through Engine.load with directTransport
 * (credentials from env <NAME>_API_KEY), print the result including usage.
 *
 * ONE encoding: the flags ARE zRunInput's fields in CLI kebab-case
 * (cliffy maps --query-params → options.queryParams etc. — verbatim field
 * match, no escape hatch, no precedence rules).
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
    .option("--body <json:string>", "RunInput.body (JSON).")
    .option(
        "--query-params <json:string>",
        "RunInput.queryParams (JSON object).",
    )
    .option("--path-params <json:string>", "RunInput.pathParams (JSON object).")
    .parse(Deno.args);

const endpointId = args[0];

const input: RunInput = {
    ...(options.body !== undefined
        ? { body: parseJson("--body", options.body) }
        : {}),
    ...(options.queryParams !== undefined
        ? {
            queryParams: parseJson(
                "--query-params",
                options.queryParams,
            ) as RunInput["queryParams"],
        }
        : {}),
    ...(options.pathParams !== undefined
        ? {
            pathParams: parseJson(
                "--path-params",
                options.pathParams,
            ) as RunInput["pathParams"],
        }
        : {}),
};

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
