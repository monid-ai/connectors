import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import {
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

const HERE = fromFileUrl(new URL("./", import.meta.url));
const INPUTS = JSON.parse(
    await Deno.readTextFile(`${HERE}test-inputs.json`),
) as Record<string, RunInput>;
const ID = "magic-hour#v1/image/magic-hour-ai-gif";

const run = async (name: string) =>
    await runEndpoint({
        unit: await testSealedUnit(ID),
        input: INPUTS["ai-gif-generator"],
        mode: "replay",
        fixture: await loadFixture(`${HERE}fixtures/${name}.json`),
    });

Deno.test("magic-hour: AI GIF completes with a download and settles 50 credits", async () => {
    const result = await run("recorded-job-succeeded");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 50 },
        evidence: { CALL: 1 },
    });
    const output = result.output as {
        status: string;
        downloads: Array<{ url: string }>;
    };
    assertEquals(output.status, "complete");
    assertEquals(
        output.downloads[0].url,
        "https://videos.magichour.ai/cmuh8q75q0101k101fvgj9518/output.gif",
    );
});

Deno.test("magic-hour: failed image project returns an error with zero usage", async () => {
    const result = await run("synthetic-job-failed");
    assertEquals(result.httpStatus, 500);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("magic-hour: canceled image project returns 409 with zero usage", async () => {
    const result = await run("synthetic-job-canceled");
    assertEquals(result.httpStatus, 409);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("magic-hour: an unrecognized status keeps polling until the project completes", async () => {
    const result = await run("synthetic-job-unknown-status");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 50 },
        evidence: { CALL: 1 },
    });
});

Deno.test("magic-hour: rejected submission does not poll or bill", async () => {
    const result = await run("synthetic-start-rejected");
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("magic-hour: completed project without download is not successful", async () => {
    const result = await run("synthetic-job-no-download");
    assertEquals(result.httpStatus, 502);
    assertEquals(result.providerHttpStatus, 200);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("magic-hour: an omitted output_format is sent as gif", async () => {
    const sent: Json[] = [];
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: (_input, init) => {
                sent.push(JSON.parse(String(init?.body)));
                return Promise.resolve(
                    new Response(JSON.stringify({ message: "stop here" }), {
                        status: 402,
                        headers: { "content-type": "application/json" },
                    }),
                );
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(ID));
    await loaded.run({ body: { style: { prompt: "a cat" } } });
    assertEquals(sent, [{ style: { prompt: "a cat" }, output_format: "gif" }]);
});

Deno.test("magic-hour: the input schema rejects before the wire", async () => {
    const unit = await testSealedUnit(ID);
    // No fixture: any upstream call fails the test.
    const rejects = async (body: Json, why: string) => {
        await assertRejects(
            () => runEndpoint({ unit, input: { body }, mode: "replay" }),
            Error,
            "INVALID_INPUT",
            why,
        );
    };
    await rejects({ style: { prompt: "a".repeat(501) } }, "prompt over 500");
    await rejects({ style: { prompt: "" } }, "empty prompt");
    await rejects(
        { style: { prompt: "a cat" }, output_format: "png" },
        "unknown format",
    );
    await rejects(
        { style: { prompt: "a cat" }, image_count: 2 },
        "unknown key",
    );
});

Deno.test({
    name: "magic-hour live: renders a real GIF and settles 50 credits",
    ignore: liveSkip("magic-hour"),
    fn: async () => {
        const result = await runEndpoint({
            unit: await testSealedUnit(ID),
            input: INPUTS["ai-gif-generator"],
            mode: "live",
        });
        assertEquals(result.httpStatus, 200);
        const output = result.output as { downloads: Array<{ url: string }> };
        assert(output.downloads[0].url);
        assertEquals(result.usage, {
            credits: { default: 50 },
            evidence: { CALL: 1 },
        });
    },
});
