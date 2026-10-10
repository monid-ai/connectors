import { assert, assertEquals, assertRejects } from "@std/assert";
import { fromFileUrl } from "@std/path";
import type { Json, RunInput } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    estimateEndpoint,
    liveSkip,
    loadFixture,
    runEndpoint,
    testBundle,
    testSealedUnit,
} from "@shared/testing";

const HERE = fromFileUrl(new URL("./fixtures/", import.meta.url));
const successUsage = { credits: { default: 0.0009 }, evidence: { RESULT: 1 } };

/** Fixed expectations from the public API contract, not derived from the docs
 * under test. The strings below are synthetic input examples, not claims that
 * those targets exist. Live qualification has its own explicit input gate.
 */
const cases: {
    id: string;
    body: Record<string, Json>;
    wire: Record<string, Json>;
    fixture: string;
}[] = [
    {
        id: "instagram/post",
        body: { url: "https://www.instagram.com/reel/C8xExampleAbc/" },
        wire: { url: "https://www.instagram.com/reel/C8xExampleAbc/" },
        fixture: "synthetic-post-success",
    },
    {
        id: "tiktok/video",
        body: {
            url: "https://www.tiktok.com/@creator/video/7398210000000000000",
        },
        wire: {
            url: "https://www.tiktok.com/@creator/video/7398210000000000000",
        },
        fixture: "synthetic-post-success",
    },
    {
        id: "facebook/post",
        body: { url: "https://www.facebook.com/reel/2781078362247521/" },
        wire: { url: "https://www.facebook.com/reel/2781078362247521/" },
        fixture: "synthetic-post-success",
    },
    {
        id: "x/post",
        body: { url: "https://x.com/creator/status/2064099405758906727" },
        wire: { url: "https://x.com/creator/status/2064099405758906727" },
        fixture: "synthetic-post-success",
    },
    {
        id: "youtube/video",
        body: { url: "https://www.youtube.com/watch?v=abcdefghijk" },
        wire: { url: "https://www.youtube.com/watch?v=abcdefghijk" },
        fixture: "synthetic-post-success",
    },
    ...["instagram", "tiktok", "facebook", "x"].map((platform) => ({
        id: `${platform}/profile`,
        body: { username: "samplecreator" },
        wire: { username: "samplecreator", platform, pages: 1 },
        fixture: "synthetic-profile-success",
    })),
    {
        id: "youtube/channel",
        body: {
            channelUrl: "https://www.youtube.com/@samplecreator",
            recentVideosLimit: 12,
        },
        wire: {
            channelUrl: "https://www.youtube.com/@samplecreator",
            platform: "youtube",
            type: "channel",
            recentVideosLimit: 12,
        },
        fixture: "synthetic-channel-success",
    },
    {
        id: "youtube/channel-videos",
        body: { channelUrl: "@samplecreator", recentVideosLimit: 12 },
        wire: {
            channelUrl: "@samplecreator",
            platform: "youtube",
            type: "channelVideos",
            recentVideosLimit: 12,
        },
        fixture: "synthetic-channel-videos-success",
    },
];

const idFor = (id: string) => `refetcher#${id}`;
const fixtureFor = (name: string) => loadFixture(`${HERE}${name}.json`);
const rejects = async (id: string, input: RunInput) => {
    const unit = await testSealedUnit(idFor(id));
    await assertRejects(
        () => runEndpoint({ unit, input, mode: "replay" }),
        Error,
        "INVALID_INPUT",
    );
};

Deno.test("refetcher catalog: eleven platform tools share one public API and one USD rate", async () => {
    const bundle = await testBundle();
    assertEquals(
        Object.keys(bundle.endpoints).filter((id) =>
            id.startsWith("refetcher#")
        ).sort(),
        cases.map((row) => idFor(row.id)).sort(),
    );
    const first = bundle.endpoints[idFor(cases[0].id)];
    for (const row of cases) {
        const doc = bundle.endpoints[idFor(row.id)];
        assertEquals(doc.request.url, "https://api.refetcher.com/");
        assertEquals(doc.request.method, "POST");
        assertEquals(doc.usage.model, {
            kind: "PER_UNIT",
            unit: "RESULT",
            every: 1,
            consumes: { credit: "default", amount: 0.0009 },
            label: "successful scrape",
            description:
                "One successful post/video or billable profile/YouTube upload page; successful profile and channel metadata costs at least one unit.",
        });
        assertEquals(doc.usage.credits, { default: { label: "US dollars" } });
        assertEquals(doc.usage.consolidate, undefined);
        assertEquals(doc.usage.evidence.$fn.key, first.usage.evidence.$fn.key);
        assertEquals(doc.auth.inject.$fn.key, first.auth.inject.$fn.key);
    }
});

Deno.test("refetcher wire: exact single target, pinned controls, and X-API-Key injection on all eleven tools", async () => {
    for (const row of cases) {
        const fixture = await fixtureFor(row.fixture);
        let calls = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "refetcher-test-key" }),
                fetch: (url, init) => {
                    calls++;
                    assertEquals(
                        String(url),
                        "https://api.refetcher.com/",
                        row.id,
                    );
                    assertEquals(init?.method, "POST", row.id);
                    assertEquals(
                        new Headers(init?.headers).get("X-API-Key"),
                        "refetcher-test-key",
                    );
                    assertEquals(
                        JSON.parse(String(init?.body)),
                        row.wire,
                        row.id,
                    );
                    return Promise.resolve(
                        Response.json(fixture.calls[0].res.body),
                    );
                },
            }),
        });
        const loaded = await engine.load(await testSealedUnit(idFor(row.id)));
        const result = await loaded.run({ body: row.body });
        assertEquals(calls, 1, row.id);
        assertEquals(result.usage, successUsage, row.id);
        assertEquals(result.output, fixture.calls[0].res.body, row.id);
    }
});

Deno.test("refetcher replay: success is one unit, including metadata with no recent posts and nested channel videos", async () => {
    for (const row of cases) {
        const unit = await testSealedUnit(idFor(row.id));
        const input = { body: row.body };
        assertEquals(await estimateEndpoint(unit, input), successUsage, row.id);
        const fixture = await fixtureFor(row.fixture);
        const result = await runEndpoint({
            unit,
            input,
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.usage, successUsage, row.id);
        assertEquals(result.output, fixture.calls[0].res.body);
    }
});

Deno.test("refetcher replay: per-target failure inside HTTP 200 costs zero despite top-level success", async () => {
    for (const row of cases) {
        const fixture = await fixtureFor("synthetic-target-failure");
        const result = await runEndpoint({
            unit: await testSealedUnit(idFor(row.id)),
            input: { body: row.body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.usage.credits, {});
        assertEquals(result.usage.evidence.RESULT ?? 0, 0);
        assertEquals(result.output, fixture.calls[0].res.body);
    }
});

Deno.test("refetcher replay: authentication, balance, unavailable target, rate limit, and upstream errors cost zero", async () => {
    const unit = await testSealedUnit("refetcher#youtube/video");
    for (const status of [400, 401, 402, 404, 429, 500, 502, 503]) {
        const fixture = await fixtureFor("synthetic-provider-error");
        fixture.calls[0].res.status = status;
        const result = await runEndpoint({
            unit,
            input: { body: { url: "https://youtu.be/abcdefghijk" } },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, status);
        assertEquals(result.isProviderError, true);
        assertEquals(result.usage, { credits: {}, evidence: {} });
    }
});

Deno.test("refetcher billing: malformed success envelopes fail instead of silently inventing a charge", async () => {
    const unit = await testSealedUnit("refetcher#youtube/video");
    const malformed: Json[] = [
        {},
        { results: [] },
        { results: [{ success: true }, { success: true }] },
        { results: [{ success: "true" }] },
        { results: [{}] },
    ];
    for (const body of malformed) {
        const fixture = await fixtureFor("synthetic-post-success");
        fixture.calls[0].res.body = body;
        await assertRejects(() =>
            runEndpoint({
                unit,
                input: { body: { url: "https://youtu.be/abcdefghijk" } },
                mode: "replay",
                fixture,
            })
        );
    }
});

Deno.test("refetcher recorded unauthorized response: real authentication failure settles at zero", async () => {
    const result = await runEndpoint({
        unit: await testSealedUnit("refetcher#youtube/video"),
        input: { body: { url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" } },
        mode: "replay",
        fixture: await fixtureFor("unauthorized"),
    });
    assertEquals(result.httpStatus, 401);
    assertEquals(result.isProviderError, true);
    assertEquals(result.usage, { credits: {}, evidence: {} });
});

Deno.test("refetcher input: reject hidden batches, extra query/path parameters, aliases, and missing targets before IO", async () => {
    for (const row of cases) {
        await rejects(row.id, { body: {} });
        await rejects(row.id, {});
        for (
            const extra of [
                { urls: ["https://youtu.be/abcdefghijk"] },
                { directUrls: ["https://youtu.be/abcdefghijk"] },
                { postURLs: ["https://youtu.be/abcdefghijk"] },
                { profileUrl: "https://instagram.com/another/" },
                { profileUrls: ["https://instagram.com/another/"] },
                { channelUrls: ["@another"] },
                { usernames: ["another"] },
                { recentPostsLimit: 100 },
                { cursor: "unmodeled-alias" },
                { includePagination: true },
                { apiKey: "must-not-reach-vendor" },
            ] as Record<string, Json>[]
        ) {
            await rejects(row.id, { body: { ...row.body, ...extra } });
        }
        await rejects(row.id, { body: row.body, queryParams: { pages: 25 } });
        await rejects(row.id, {
            body: row.body,
            pathParams: { path: "people-search" },
        });
    }
});

Deno.test("refetcher input: enforce page limits and resource discriminators", async () => {
    for (const platform of ["instagram", "tiktok", "facebook", "x"]) {
        for (const pages of [0, -1, 26, 1.5, "1"]) {
            await rejects(`${platform}/profile`, {
                body: { username: "creator", pages },
            });
        }
        await rejects(`${platform}/profile`, {
            body: { username: ["creator", "another"] },
        });
        await rejects(`${platform}/profile`, {
            body: { username: "https://instagram.com/creator" },
        });
        await rejects(`${platform}/profile`, {
            body: { username: "creator", platform: "youtube" },
        });
    }
    for (const id of ["youtube/channel", "youtube/channel-videos"]) {
        for (const recentVideosLimit of [0, -1, 301, 1.5, "12"]) {
            await rejects(id, {
                body: { channelUrl: "@creator", recentVideosLimit },
            });
        }
        for (
            const alias of [{ videoLimit: 300 }, {
                limit: 300,
            }] as Record<string, Json>[]
        ) {
            await rejects(id, { body: { channelUrl: "@creator", ...alias } });
        }
        for (const pages of [0, -1, 26, 1.5, "25", null, true]) {
            await rejects(id, { body: { channelUrl: "@creator", pages } });
        }
        await rejects(id, {
            body: { channelUrl: "@creator", platform: "instagram" },
        });
        await rejects(id, {
            body: { channelUrl: "https://youtube.com/watch?v=abcdefghijk" },
        });
        const wrongType = id === "youtube/channel"
            ? "channelVideos"
            : "channel";
        await rejects(id, {
            body: { channelUrl: "@creator", type: wrongType },
        });
        for (
            const recentVideosLimit of [
                ...Array.from({ length: 50 }, (_, index) => index + 1),
                300,
            ]
        ) {
            const unit = await testSealedUnit(idFor(id));
            const pages = Math.ceil(recentVideosLimit / 12);
            assertEquals(
                await estimateEndpoint(unit, {
                    body: { channelUrl: "@creator", recentVideosLimit },
                }),
                {
                    credits: { default: pages * 0.0009 },
                    evidence: { RESULT: pages },
                },
            );
        }
    }
});

Deno.test("refetcher input: post tools reject profiles, foreign hosts, and unsupported TikTok short links", async () => {
    const invalid: Record<string, string[]> = {
        "instagram/post": [
            "https://instagram.com/nasa/",
            "https://instagram.com.evil.example/p/C8xExampleAbc/",
            "https://x.com/creator/status/123",
        ],
        "tiktok/video": [
            "https://www.tiktok.com/@creator",
            "https://vm.tiktok.com/short/",
            "https://tiktok.com.evil.example/@creator/video/123",
        ],
        "facebook/post": [
            "https://facebook.com/nasa",
            "https://facebook.com/profile.php?id=123",
            "https://facebook.com.evil.example/reel/123",
        ],
        "x/post": [
            "https://x.com/creator",
            "https://x.com.evil.example/creator/status/123",
        ],
        "youtube/video": [
            "https://youtube.com/@creator",
            "https://youtube.com.evil.example/watch?v=abcdefghijk",
        ],
    };
    for (const [id, urls] of Object.entries(invalid)) {
        for (const url of urls) await rejects(id, { body: { url } });
    }
});

Deno.test("refetcher input: enforce native Facebook cursor and X status ID bounds before IO", async () => {
    await rejects("facebook/profile", {
        body: { username: "nasa", after: "a".repeat(12001) },
    });
    for (const length of [7, 26]) {
        await rejects("x/post", {
            body: { url: `https://x.com/creator/status/${"1".repeat(length)}` },
        });
    }
    assertEquals(
        await estimateEndpoint(
            await testSealedUnit(idFor("facebook/profile")),
            {
                body: { username: "nasa", after: "a".repeat(12000) },
            },
        ),
        successUsage,
    );
    for (const length of [8, 25]) {
        assertEquals(
            await estimateEndpoint(await testSealedUnit(idFor("x/post")), {
                body: {
                    url: `https://x.com/creator/status/${"1".repeat(length)}`,
                },
            }),
            successUsage,
        );
    }
});

Deno.test("refetcher input: comments, Facebook cursors, X ordering, and nullable metrics remain supported", async () => {
    const accepted: { id: string; body: Record<string, Json> }[] = [
        {
            id: "tiktok/video",
            body: {
                ...cases[1].body,
                includeRecentComments: true,
                recentCommentsLimit: 100,
            },
        },
        {
            id: "youtube/video",
            body: {
                ...cases[4].body,
                includeRecentComments: true,
                recentCommentsLimit: 1,
            },
        },
        {
            id: "facebook/profile",
            body: {
                username: "nasa",
                includeRecentPosts: true,
                after: "opaque-cursor",
            },
        },
        {
            id: "x/profile",
            body: {
                username: "nasa",
                includeRecentPosts: true,
                sort: "popular",
            },
        },
        {
            id: "facebook/post",
            body: {
                ...cases[2].body,
                requiredFields: ["reactions", "topLevelComments", "plays"],
            },
        },
    ];
    for (const { id, body } of accepted) {
        assertEquals(
            await estimateEndpoint(await testSealedUnit(idFor(id)), { body }),
            successUsage,
        );
    }
    const fixture = await fixtureFor("synthetic-post-success");
    const result = await runEndpoint({
        unit: await testSealedUnit("refetcher#instagram/post"),
        input: { body: cases[0].body },
        mode: "replay",
        fixture,
    });
    assertEquals(result.output, fixture.calls[0].res.body);
});

// The key convention is Monid's standard. The additional JSON input map keeps
// tests opt-in for specific public targets instead of relying on expiring posts.
// Example: REFETCHER_LIVE_INPUTS='{"youtube/video":{"url":"..."}}'
const liveInputs = Deno.env.get("REFETCHER_LIVE_INPUTS");
Deno.test({
    name: "refetcher live (gated on credentials and REFETCHER_LIVE_INPUTS)",
    ignore: liveSkip("refetcher") || !liveInputs,
    fn: async () => {
        const inputs = JSON.parse(liveInputs!) as Record<string, Json>;
        assert(
            Object.keys(inputs).length > 0,
            "Provide at least one explicit live target",
        );
        for (const [id, body] of Object.entries(inputs)) {
            assert(
                cases.some((row) => row.id === id),
                `Unknown Refetcher tool ${id}`,
            );
            const result = await runEndpoint({
                unit: await testSealedUnit(idFor(id)),
                input: { body },
                mode: "live",
            });
            assertEquals(result.isProviderError, false);
            const output = result.output as Record<string, Json>;
            assert(output !== null && typeof output === "object");
            assert(Array.isArray(output.results));
            assertEquals(output.results.length, 1);
            const target = output.results[0] as Record<string, Json>;
            assert(target !== null && typeof target === "object");
            assertEquals(target.success, true);
            assert(typeof result.usage.credits.default === "number");
            assert(typeof result.usage.evidence.RESULT === "number");
        }
    },
});
