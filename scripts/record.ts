/**
 * deno task record <provider>#<endpoint> <scenario> --body '<json>'
 *
 * The fixture RECORDER: replay tests need real {req, res} exchanges, so this
 * runs the endpoint LIVE once (env <NAME>_API_KEY) through the engine with a
 * wrapped fetch, captures the request/response pairs (headers NEVER recorded
 * — credentials cannot leak), and writes
 * connectors/<provider>/endpoints/<endpoint>/fixtures/<scenario>.json.
 * From then on `deno task test` replays that byte-real vendor shape with
 * zero network and zero keys.
 */
import { join } from "@std/path";
import { Command } from "@cliffy/command";
import { type Json, type RunInput, sealUnit } from "@shared/core";
import { type RecordedCall, runEndpoint, zFixture } from "@shared/testing";
import { compileToOutput, parseEndpointId, REPO_ROOT } from "./lib.ts";

function parseJson(flag: string, raw: string): Json {
    try {
        return JSON.parse(raw) as Json;
    } catch (error) {
        throw new Error(`${flag} is not valid JSON: ${error}`);
    }
}

const { options, args } = await new Command()
    .name("record")
    .description("Record a live call as a replay fixture.")
    .arguments("<endpoint:string> <scenario:string>")
    .option("--body <json:string>", "Request body (JSON).")
    .option("--input <json:string>", "Full RunInput (escape hatch).")
    .parse(Deno.args);

const [endpointId, scenario] = args;
const selector = parseEndpointId(endpointId); // split needed only for the fixture path

let input: RunInput = {};
if (options.input !== undefined) {
    const full = parseJson("--input", options.input);
    input = full !== null && typeof full === "object" && !Array.isArray(full) &&
            ("body" in full || "queryParams" in full || "pathParams" in full)
        ? full as RunInput
        : { body: full };
}
if (options.body !== undefined) {
    input = { ...input, body: parseJson("--body", options.body) };
}

const { bundle } = await compileToOutput();
const unit = sealUnit(bundle, endpointId);

const sink: RecordedCall[] = [];
const result = await runEndpoint({ unit, input, mode: "record", sink });

const fixturePath = join(
    REPO_ROOT,
    "connectors",
    selector.provider,
    "endpoints",
    selector.endpoint,
    "fixtures",
    `${scenario}.json`,
);
const fixture = zFixture.parse({ name: scenario, calls: sink });
await Deno.writeTextFile(fixturePath, JSON.stringify(fixture, null, 4) + "\n");

console.log(`recorded ${sink.length} call(s) → ${fixturePath}`);
console.log(
    JSON.stringify(
        { usage: result.usage, isProviderError: result.isProviderError },
        null,
        2,
    ),
);
