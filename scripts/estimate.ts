/**
 * deno task engine:estimate <provider>#<endpoint> [--body '<json>']
 *                           [--query-params '<json>'] [--path-params '<json>']
 *
 * The STANDALONE estimate command: compile (or reuse the .output/ cache),
 * seal the endpoint, load it, and print `estimate()`'s Usage as JSON.
 * PURE by construction — the injected transport REJECTS every call (proof
 * that estimating does no IO), and no credential is needed. This is the
 * transparency tool: anyone can ask "what would this input cost in units?"
 * without running anything; the hosted rate card turns the units into $.
 *
 * Flags mirror engine:run — zRunInput's fields in CLI kebab-case.
 */
import { Command } from "@cliffy/command";
import { type Json, type RunInput, sealUnit } from "@shared/core";
import { Engine } from "@monid/connector-engine";
import { compileToOutput } from "./lib.ts";

function parseJson(flag: string, raw: string): Json {
    try {
        return JSON.parse(raw) as Json;
    } catch (error) {
        throw new Error(`${flag} is not valid JSON: ${error}`);
    }
}

const { options, args } = await new Command()
    .name("engine:estimate")
    .description(
        "Compile (cached) and print one endpoint's pre-run usage estimate.",
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

const { bundle } = await compileToOutput();
const loaded = await new Engine({
    transport: {
        execute: () =>
            Promise.reject(new Error("estimate is pure — no IO allowed")),
    },
}).load(sealUnit(bundle, endpointId));

console.log(JSON.stringify(
    {
        endpoint: endpointId,
        model: loaded.doc.usage.model ?? null,
        estimate: loaded.estimate(input),
    },
    null,
    2,
));
