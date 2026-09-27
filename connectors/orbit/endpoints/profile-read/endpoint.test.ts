import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
    assertInputAccepted,
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const chains = fromFileUrl(new URL("../../fixtures/", import.meta.url));
const ID = "orbit#v3/profile/{profile_id}";
const PROFILE = "a23ff3b7-b6cc-4ac6-8d4f-0c909cd956f5";

const read = async (fixture: string) =>
    runEndpoint({
        unit: await testSealedUnit(ID),
        input: { pathParams: { profile_id: PROFILE } },
        mode: "replay",
        fixture: await loadFixture(`${chains}${fixture}`),
    });

Deno.test("orbit#v3/profile/{profile_id}: the read settles on its receipt, and the profile rides through", async () => {
    const result = await read("synthetic-profile-read.json");
    assertEquals(result.httpStatus, 200);
    assertEquals(result.usage, {
        credits: { default: 1 },
        evidence: { CREDIT: 1 },
    });
    const output = result.output as Record<string, unknown>;
    assertEquals(output.generation_level, 3);
    const profile = output.profile as Record<string, unknown>;
    assertEquals((profile.sections as unknown[]).length, 1);
    assertEquals("billing" in output, false);
});

Deno.test("orbit#v3/profile/{profile_id}: the identity is DECLARED, the call is the vendor's", async () => {
    const unit = await testSealedUnit(ID);
    // The read and the build share `/v3/enrich/{profile_id}` on Orbit's
    // side, and two defs on one path collide — so the read takes its own
    // name while still calling the vendor path unchanged.
    assertEquals(unit.doc.id, ID);
    assertEquals(unit.doc.request.method, "GET");
    assertEquals(
        unit.doc.request.url,
        "https://api.orbitsearch.com/v3/enrich/{profile_id}",
    );
    assertEquals(
        (await estimateEndpoint(unit, {
            pathParams: { profile_id: PROFILE },
        })).credits,
        { default: 1 },
    );
});

Deno.test("orbit#v3/profile/{profile_id}: a vendor refusal is zero-billed data", async () => {
    const result = await read("synthetic-profile-read-error.json");
    assertEquals(result.httpStatus, 402);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("orbit#v3/profile/{profile_id}: the gate rejects an empty id, and passes a real one", async () => {
    const unit = await testSealedUnit(ID);
    const fixture = await loadFixture(`${chains}synthetic-profile-read.json`);

    // NEAR-VALID and bad: an empty id would otherwise resolve to
    // `/v3/enrich/`, which is a different route.
    await assertRejects(
        () =>
            runEndpoint({
                unit,
                input: { pathParams: { profile_id: "" } },
                mode: "replay",
                fixture,
            }),
        Error,
        "INVALID_INPUT",
    );
    // A public slug is as valid as a uuid here.
    await assertInputAccepted({
        unit,
        input: { pathParams: { profile_id: "ada-fielding" } },
        mode: "replay",
        fixture,
    });
});

Deno.test({
    name: "orbit#v3/profile/{profile_id} live: a read answers with a profile",
    ignore: liveSkip("orbit"),
    fn: async () => {
        const unit = await testSealedUnit(ID);
        const result = await runEndpoint({
            unit,
            input: { pathParams: { profile_id: PROFILE } },
            mode: "live",
        });
        assertEquals(
            result.isProviderError,
            false,
            JSON.stringify(result.output),
        );
        const pools = Object.keys(result.usage.credits);
        assert(pools.length === 0 || pools.join() === "default", pools.join());
        const output = result.output as Record<string, unknown>;
        assert("profile" in output, JSON.stringify(output).slice(0, 200));
        assert("generation_level" in output);
    },
});
