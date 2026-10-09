import {
    assert,
    assertAlmostEquals,
    assertEquals,
    assertRejects,
} from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";
import { directTransport, Engine } from "@monid/connector-engine";

const HERE = fromFileUrl(new URL("./", import.meta.url));
const IMAGE_ID = "muapi#nano-banana-2";
const EDIT_ID = "muapi#nano-banana-2-edit";
const VIDEO_ID = "muapi#veo3.1-text-to-video";

const INPUTS: Record<string, RunInput> = {
    [IMAGE_ID]: { body: { prompt: "a lighthouse in fog" } },
    [EDIT_ID]: {
        body: {
            prompt: "turn the lighthouse into a warm watercolor illustration",
            images_list: ["https://example.com/lighthouse.png"],
            resolution: "2k",
        },
    },
    [VIDEO_ID]: { body: { prompt: "a lighthouse beam sweeping across fog" } },
};

const fixture = (name: string) =>
    loadFixture(HERE + "fixtures/" + name + ".json");

async function estimate(id: string, body: Json) {
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "test-key" }),
            fetch: () => Promise.reject(new Error("estimate must not do IO")),
        }),
    });
    const loaded = await engine.load(await testSealedUnit(id));
    return loaded.estimate({ body });
}

Deno.test("muapi: Nano Banana 2 image generation settles vendor cost", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(IMAGE_ID),
        input: INPUTS[IMAGE_ID],
        mode: "replay",
        fixture: await fixture("synthetic-nano-image-succeeded"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.isProviderError, false);
    assertEquals(result.usage, {
        credits: { default: 0.06 },
        evidence: { "1k_image": 1 },
    });
    const output = result.output as Record<string, Json>;
    assertEquals(output.status, "completed");
    assertEquals(output.outputs, [
        "https://cdn.muapi.ai/image/MUAPI_NANO_1.jpg",
    ]);
    assert(!("cost" in output));
});

Deno.test("muapi: nested vendor cost is settled and removed", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(IMAGE_ID),
        input: INPUTS[IMAGE_ID],
        mode: "replay",
        fixture: await fixture("synthetic-nested-cost-succeeded"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.06 },
        evidence: { "1k_image": 1 },
    });
    const output = result.output as Record<string, Json>;
    const data = output.data as Record<string, Json>;
    assertEquals(data.outputs, [
        "https://cdn.muapi.ai/image/MUAPI_NANO_NESTED_1.jpg",
    ]);
    assert(!("cost" in data));
});

Deno.test("muapi: Nano Banana 2 editing settles per-resolution cost", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(EDIT_ID),
        input: INPUTS[EDIT_ID],
        mode: "replay",
        fixture: await fixture("synthetic-nano-edit-succeeded"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 0.09 },
        evidence: { "2k_image": 1 },
    });
    const output = result.output as Record<string, Json>;
    assertEquals(output.outputs, [
        "https://cdn.muapi.ai/image/MUAPI_NANO_EDIT_1.png",
    ]);
});

Deno.test("muapi: Veo 3.1 video settles the selected resolution price", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit(VIDEO_ID),
        input: INPUTS[VIDEO_ID],
        mode: "replay",
        fixture: await fixture("synthetic-veo-video-succeeded"),
    });
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 2.5 },
        evidence: { "720p_video": 1 },
    });
    const output = result.output as Record<string, Json>;
    assertEquals(output.outputs, [
        "https://cdn.muapi.ai/video/MUAPI_VEO_1.mp4",
    ]);
});

Deno.test("muapi: failed predictions are synthesized as zero-usage errors", async () => {
    for (const id of [IMAGE_ID, EDIT_ID, VIDEO_ID]) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: INPUTS[id],
            mode: "replay",
            fixture: await fixture("synthetic-task-failed"),
        });
        assertEquals(result.httpStatus, 500, id);
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
        const output = result.output as Record<string, Json>;
        assertEquals(output.message, "the prompt was rejected", id);
        assert("raw" in output, id);
    }
});

Deno.test("muapi: rejected submissions are zero-usage error-as-data", async () => {
    for (const id of [IMAGE_ID, EDIT_ID, VIDEO_ID]) {
        const result = await runEndpoint({
            unit: await testSealedUnit(id),
            input: INPUTS[id],
            mode: "replay",
            fixture: await fixture("synthetic-submit-rejected"),
        });
        assertEquals(result.httpStatus, 401, id);
        assertEquals(result.isProviderError, true, id);
        assertEquals(result.usage, { credits: {}, evidence: {} }, id);
        const output = result.output as Record<string, Json>;
        assertEquals(output.code, "invalid_api_key", id);
        assertEquals(output.message, "invalid api key", id);
    }
});

Deno.test("muapi: estimates cover image resolution and Veo resolution", async () => {
    assertEquals(
        await estimate(IMAGE_ID, { prompt: "x", resolution: "4k" }),
        { credits: { default: 0.12 }, evidence: { "4k_image": 1 } },
    );
    assertEquals(
        await estimate(EDIT_ID, {
            prompt: "x",
            images_list: ["https://example.com/a.png"],
            resolution: "2k",
        }),
        { credits: { default: 0.09 }, evidence: { "2k_image": 1 } },
    );
    assertAlmostEquals(
        (await estimate(VIDEO_ID, {
            prompt: "x",
            resolution: "1080p",
        })).credits.default,
        3.25,
    );
});

Deno.test("muapi: endpoint bindings reject missing or invalid inputs", async () => {
    await assertRejects(() => estimate(IMAGE_ID, {}), Error, "INVALID_INPUT");
    await assertRejects(
        () =>
            estimate(EDIT_ID, {
                prompt: "x",
                images_list: [],
            }),
        Error,
        "INVALID_INPUT",
    );
    await assertRejects(
        () => estimate(VIDEO_ID, { prompt: "x", duration: 4 }),
        Error,
        "INVALID_INPUT",
    );
});
