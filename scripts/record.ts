/**
 * deno task record <provider>#<endpoint> <scenario> [--body '<json>']
 *                  [--query-params '<json>'] [--path-params '<json>']
 *
 * The fixture RECORDER: replay tests need real {req, res} exchanges, so this
 * runs the endpoint LIVE once (env <NAME>_API_KEY) through the engine with a
 * wrapped fetch, captures the request/response pairs (headers NEVER recorded
 * — credentials cannot leak), and writes
 * connectors/<provider>/endpoints/<endpoint>/fixtures/<scenario>.json.
 * From then on `deno task test` replays that vendor shape with zero network
 * and zero keys.
 *
 * FIXTURE DIET (default ON, `--no-trim` opts out): recorded RESPONSE bodies
 * pass through the deterministic trim (arrays capped, long strings
 * truncated — see shared/testing/fixtures.ts) BEFORE writing. The wire
 * chain (requests/urls/statuses) is untouched, so replay matching is
 * unaffected; only the consumed payload bulk shrinks. NOTE: the printed
 * usage below reflects the LIVE (untrimmed) responses — replay assertions
 * must count the trimmed fixture's reality.
 *
 * Input flags mirror engine:run: zRunInput's fields in CLI kebab-case.
 */
import { join } from "@std/path";
import { Command } from "@cliffy/command";
import { type Json, type RunInput, sealUnit } from "@shared/core";
import {
    type RecordedCall,
    runEndpoint,
    trimCalls,
    zFixture,
} from "@shared/testing";
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
    .option("--body <json:string>", "RunInput.body (JSON).")
    .option(
        "--query-params <json:string>",
        "RunInput.queryParams (JSON object).",
    )
    .option("--path-params <json:string>", "RunInput.pathParams (JSON object).")
    .option(
        "--no-trim",
        "Keep full recorded response bodies (skip the fixture-diet trim).",
    )
    .parse(Deno.args);

const [endpointId, scenario] = args;
const selector = parseEndpointId(endpointId); // split needed only for the fixture path

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
const fixture = zFixture.parse({
    name: scenario,
    calls: options.trim === false ? sink : trimCalls(sink),
});
await Deno.mkdir(join(fixturePath, ".."), { recursive: true });
await Deno.writeTextFile(fixturePath, JSON.stringify(fixture, null, 4) + "\n");

console.log(`recorded ${sink.length} call(s) → ${fixturePath}`);
console.log(
    JSON.stringify(
        { usage: result.usage, isProviderError: result.isProviderError },
        null,
        2,
    ),
);
