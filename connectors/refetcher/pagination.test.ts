import { assertEquals, assertRejects } from "@std/assert";
import type { Json } from "@shared/core";
import { directTransport, Engine } from "@monid/connector-engine";
import {
    estimateEndpoint,
    loadFixture,
    runEndpoint,
    testSealedUnit,
} from "@shared/testing";

const platforms = ["instagram", "tiktok", "facebook", "x"] as const;
type Platform = typeof platforms[number];
const input = (pages: number) => ({
    body: { username: "samplecreator", includeRecentPosts: true, pages },
});
const usage = (pages: number, usd: number) => ({
    credits: { default: usd },
    evidence: { RESULT: pages },
});

// Constructed responses only: these cases do not claim live qualification.
function profile(platform: Platform, count: number, fetched?: Json) {
    const posts = Array.from(
        { length: count },
        (_, id) => ({ id: String(id) }),
    );
    return {
        success: true,
        results: [{
            success: true,
            platform,
            type: "profile",
            profile: { handle: "samplecreator" },
            recentPosts: posts,
            recentVideos: posts,
            postLinks: posts.map((p) => `https://example.com/post/${p.id}`),
            pageInfo: {
                recentPosts: {
                    returnedCount: count,
                    pagesRequested: 25,
                    ...(fetched === undefined ? {} : { pagesFetched: fetched }),
                },
            },
        }],
    };
}

async function replay(
    platform: Platform,
    pages: number,
    output: Json,
    status = 200,
) {
    const fixture = await loadFixture(
        new URL("./fixtures/synthetic-profile-success.json", import.meta.url)
            .pathname,
    );
    fixture.calls[0].req.body = { ...input(pages).body, platform };
    fixture.calls[0].res.body = output;
    fixture.calls[0].res.status = status;
    return await runEndpoint({
        unit: await testSealedUnit(`refetcher#${platform}/profile`),
        input: input(pages),
        mode: "replay",
        fixture,
    });
}

Deno.test("refetcher pagination: all four profile tools accept 1, 2 and 25 pages with matching holds", async () => {
    for (const platform of platforms) {
        const unit = await testSealedUnit(`refetcher#${platform}/profile`);
        for (const [pages, usd] of [[1, 0.0009], [2, 0.0018], [25, 0.0225]]) {
            assertEquals(
                await estimateEndpoint(unit, input(pages)),
                usage(pages, usd),
            );
        }
        const count = platform === "x"
            ? 125
            : platform === "facebook"
            ? 75
            : 300;
        const output = profile(platform, count, 25);
        let calls = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "synthetic-test-key" }),
                fetch: (url, init) => {
                    calls++;
                    assertEquals(String(url), "https://api.refetcher.com/");
                    assertEquals(init?.method, "POST");
                    assertEquals(JSON.parse(String(init?.body)), {
                        ...input(25).body,
                        platform,
                    });
                    return Promise.resolve(Response.json(output));
                },
            }),
        });
        const loaded = await engine.load(unit);
        const result = await loaded.run(input(25));
        assertEquals(calls, 1);
        assertEquals(result.usage, usage(25, 0.0225));
        assertEquals(result.output, output);
    }
});

Deno.test("refetcher pagination: fewer delivered pages reduce settlement without double-counting duplicate arrays", async () => {
    const cases: [Platform, number, number, number, number][] = [
        ["instagram", 50, 25, 5, 0.0045],
        ["x", 11, 25, 3, 0.0027],
        ["facebook", 21, 7, 7, 0.0063],
        ["tiktok", 50, 5, 5, 0.0045],
    ];
    for (const [platform, count, fetched, billed, usd] of cases) {
        const output = profile(platform, count, fetched);
        const result = await replay(platform, 25, output);
        assertEquals(result.usage, usage(billed, usd));
        assertEquals(result.output, output);
    }
});

Deno.test("refetcher pagination: successful metadata is one unit; reported successful page reads can still cost more with empty arrays", async () => {
    for (const platform of platforms) {
        const result = await replay(platform, 25, profile(platform, 0, 0));
        assertEquals(result.usage, usage(1, 0.0009));
    }
    for (const platform of ["facebook", "tiktok"] as const) {
        const result = await replay(platform, 25, profile(platform, 0, 3));
        assertEquals(result.usage, usage(3, 0.0027));
    }
});

Deno.test("refetcher pagination: TikTok metadata-only calls with 25 pages do not require pagination evidence", async () => {
    for (const includeRecentPosts of [undefined, false]) {
        const body = {
            username: "samplecreator",
            pages: 25,
            ...(includeRecentPosts === undefined ? {} : { includeRecentPosts }),
        };
        const fixture = await loadFixture(
            new URL(
                "./fixtures/synthetic-profile-success.json",
                import.meta.url,
            ).pathname,
        );
        fixture.calls[0].req.body = { ...body, platform: "tiktok" };
        const unit = await testSealedUnit("refetcher#tiktok/profile");
        assertEquals(await estimateEndpoint(unit, { body }), usage(25, 0.0225));
        const result = await runEndpoint({
            unit,
            input: { body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.usage, usage(1, 0.0009));
    }
});

Deno.test("refetcher pagination: an incomplete history flag preserves charging for successful delivered pages", async () => {
    for (const platform of platforms) {
        const count = platform === "x" ? 6 : 13;
        const output = profile(platform, count, 2);
        const posts = output.results[0].pageInfo.recentPosts;
        Object.assign(posts, { incomplete: true, hasNextPage: true });
        const result = await replay(platform, 25, output);
        assertEquals(result.usage, usage(2, 0.0018));
        assertEquals(result.output, output);
    }
});

Deno.test("refetcher pagination: failed results and HTTP errors never settle the 25-page hold", async () => {
    for (const platform of platforms) {
        for (const status of [200, 502]) {
            const result = await replay(platform, 25, {
                success: true,
                results: [{ success: false, error: "synthetic_failure" }],
            }, status);
            assertEquals(result.usage.credits, {});
            assertEquals(result.usage.evidence.RESULT ?? 0, 0);
        }
    }
});

Deno.test("refetcher pagination: Facebook legacy absent/zero counts use the vendor fallback; single-page TikTok remains compatible", async () => {
    for (const fetched of [undefined, null, 0]) {
        const result = await replay(
            "facebook",
            25,
            profile("facebook", 13, fetched),
        );
        assertEquals(result.usage, usage(2, 0.0018));
    }
    const result = await replay("tiktok", 1, profile("tiktok", 12));
    assertEquals(result.usage, usage(1, 0.0009));
});

Deno.test("refetcher pagination: invalid, missing or excessive page evidence fails instead of guessing settlement", async () => {
    for (const platform of ["facebook", "tiktok"] as const) {
        for (const fetched of [-1, 1.5, "2", 26]) {
            await assertRejects(() =>
                replay(platform, 25, profile(platform, 12, fetched))
            );
        }
        await assertRejects(() =>
            replay(platform, 2, profile(platform, 12, 3))
        );
    }
    for (const fetched of [undefined, null]) {
        await assertRejects(() =>
            replay("tiktok", 25, profile("tiktok", 25, fetched))
        );
    }
    await assertRejects(() => replay("tiktok", 25, profile("tiktok", 12, 0)));
    await assertRejects(() =>
        replay("instagram", 25, profile("instagram", 301, 25))
    );
    await assertRejects(() => replay("x", 25, profile("x", 126, 25)));
    await assertRejects(() =>
        replay("instagram", 2, profile("instagram", 25, 2))
    );
    const output = profile("instagram", 12, 1) as unknown as Record<
        string,
        Json
    >;
    const target = (output.results as Record<string, Json>[])[0];
    target.recentPosts = "invalid";
    await assertRejects(() => replay("instagram", 25, output));
});

type YouTubeResource = "channel" | "channelVideos";
const youtubeId = (type: YouTubeResource) =>
    type === "channel"
        ? "refetcher#youtube/channel"
        : "refetcher#youtube/channel-videos";
const youtubeInput = (limit = 300, includeRecentVideos?: boolean) => ({
    body: {
        channelUrl: "@samplecreator",
        recentVideosLimit: limit,
        ...(includeRecentVideos === undefined ? {} : { includeRecentVideos }),
    },
});

// Prepared-contract responses, not live recordings of the YouTube expansion.
function youtubeOutput(type: YouTubeResource, count: number) {
    const videos = Array.from(
        { length: count },
        (_, id) => ({ id: String(id) }),
    );
    return {
        success: true,
        results: [{
            success: true,
            platform: "youtube",
            type,
            channel: { handle: "samplecreator" },
            ...(type === "channel"
                ? { recentVideos: videos }
                : { videos, results: videos }),
        }],
    };
}

async function replayYouTube(
    type: YouTubeResource,
    limit: number,
    output: Json,
    status = 200,
    includeRecentVideos?: boolean,
) {
    const input = youtubeInput(limit, includeRecentVideos);
    const fixture = await loadFixture(
        new URL("./fixtures/synthetic-channel-success.json", import.meta.url)
            .pathname,
    );
    fixture.calls[0].req.body = { ...input.body, platform: "youtube", type };
    fixture.calls[0].res.body = output;
    fixture.calls[0].res.status = status;
    return await runEndpoint({
        unit: await testSealedUnit(youtubeId(type)),
        input,
        mode: "replay",
        fixture,
    });
}

Deno.test("refetcher YouTube pagination: both channel resources request 300 uploads in one call and settle 25 units", async () => {
    for (const type of ["channel", "channelVideos"] as const) {
        const unit = await testSealedUnit(youtubeId(type));
        const output = youtubeOutput(type, 300);
        assertEquals(
            await estimateEndpoint(unit, youtubeInput()),
            usage(25, 0.0225),
        );
        let calls = 0;
        const engine = new Engine({
            transport: directTransport({
                params: () => Promise.resolve({ apiKey: "synthetic-test-key" }),
                fetch: (url, init) => {
                    calls++;
                    assertEquals(String(url), "https://api.refetcher.com/");
                    assertEquals(init?.method, "POST");
                    assertEquals(JSON.parse(String(init?.body)), {
                        ...youtubeInput().body,
                        platform: "youtube",
                        type,
                    });
                    return Promise.resolve(Response.json(output));
                },
            }),
        });
        const loaded = await engine.load(unit);
        const result = await loaded.run(youtubeInput());
        assertEquals(calls, 1);
        assertEquals(result.usage, usage(25, 0.0225));
        assertEquals(result.output, output);
    }
});

Deno.test("refetcher YouTube pagination: settlement uses delivered uploads without adding duplicate result arrays", async () => {
    for (const type of ["channel", "channelVideos"] as const) {
        for (
            const [count, pages, usd] of [
                [0, 1, 0.0009],
                [1, 1, 0.0009],
                [12, 1, 0.0009],
                [13, 2, 0.0018],
                [24, 2, 0.0018],
                [25, 3, 0.0027],
                [50, 5, 0.0045],
                [300, 25, 0.0225],
            ]
        ) {
            const output = youtubeOutput(type, count);
            const result = await replayYouTube(type, 300, output);
            assertEquals(result.usage, usage(pages, usd));
            assertEquals(result.output, output);
        }
    }
});

Deno.test("refetcher YouTube pagination: channel metadata-only estimates and settles one unit", async () => {
    const unit = await testSealedUnit(youtubeId("channel"));
    assertEquals(
        await estimateEndpoint(unit, youtubeInput(300, false)),
        usage(1, 0.0009),
    );
    for (const includeRecentVideos of [undefined, false]) {
        const output = {
            success: true,
            results: [{ success: true, channel: { handle: "samplecreator" } }],
        };
        const result = await replayYouTube(
            "channel",
            300,
            output,
            200,
            includeRecentVideos,
        );
        assertEquals(result.usage, usage(1, 0.0009));
    }
});

Deno.test("refetcher YouTube pagination: failed target or HTTP error releases the 25-unit estimate", async () => {
    for (const type of ["channel", "channelVideos"] as const) {
        for (const status of [200, 502]) {
            const result = await replayYouTube(type, 300, {
                success: true,
                results: [{ success: false, error: "synthetic_failure" }],
            }, status);
            assertEquals(result.usage.credits, {});
            assertEquals(result.usage.evidence.RESULT ?? 0, 0);
        }
    }
});

Deno.test("refetcher YouTube pagination: malformed or oversized upload evidence fails closed", async () => {
    for (const type of ["channel", "channelVideos"] as const) {
        await assertRejects(() =>
            replayYouTube(type, 300, youtubeOutput(type, 301))
        );
        await assertRejects(() =>
            replayYouTube(type, 13, youtubeOutput(type, 14))
        );
        const field = type === "channel" ? "recentVideos" : "videos";
        for (const value of ["invalid", {}]) {
            await assertRejects(() =>
                replayYouTube(type, 300, {
                    success: true,
                    results: [{ success: true, [field]: value }],
                })
            );
        }
    }
});

async function runYouTubeBody(
    type: YouTubeResource,
    options: Record<string, Json>,
    output: Json,
    status = 200,
) {
    const body = { channelUrl: "@samplecreator", ...options };
    let calls = 0;
    const engine = new Engine({
        transport: directTransport({
            params: () => Promise.resolve({ apiKey: "synthetic-test-key" }),
            fetch: (url, init) => {
                calls++;
                assertEquals(String(url), "https://api.refetcher.com/");
                assertEquals(init?.method, "POST");
                // Neither depth field may be silently defaulted over the
                // other. The vendor applies its 12-video default if omitted.
                assertEquals(JSON.parse(String(init?.body)), {
                    ...body,
                    platform: "youtube",
                    type,
                });
                return Promise.resolve(Response.json(output, { status }));
            },
        }),
    });
    const loaded = await engine.load(await testSealedUnit(youtubeId(type)));
    const estimate = loaded.estimate({ body });
    const result = await loaded.run({ body });
    assertEquals(calls, 1, "One request fetches the requested depth");
    assertEquals(result.output, output);
    return { estimate, result };
}

Deno.test("refetcher YouTube pages: both tools accept page depth without an injected video limit and retain the default", async () => {
    const cases: [Record<string, Json>, number, number, number][] = [
        [{}, 12, 1, 0.0009],
        [{ pages: 1 }, 12, 1, 0.0009],
        [{ pages: 2 }, 24, 2, 0.0018],
        [{ pages: 25 }, 300, 25, 0.0225],
    ];
    for (const type of ["channel", "channelVideos"] as const) {
        for (const [options, count, units, usd] of cases) {
            const { estimate, result } = await runYouTubeBody(
                type,
                options,
                youtubeOutput(type, count),
            );
            assertEquals(estimate, usage(units, usd));
            assertEquals(result.usage, usage(units, usd));
        }
    }
});

Deno.test("refetcher YouTube pages: explicit video counts win in both directions for estimates and settlement bounds", async () => {
    const cases: [number, number, number, number][] = [
        [25, 13, 2, 0.0018],
        [1, 300, 25, 0.0225],
        [25, 1, 1, 0.0009],
    ];
    for (const type of ["channel", "channelVideos"] as const) {
        for (const [pages, recentVideosLimit, units, usd] of cases) {
            const { estimate, result } = await runYouTubeBody(
                type,
                { pages, recentVideosLimit },
                youtubeOutput(type, recentVideosLimit),
            );
            assertEquals(estimate, usage(units, usd));
            assertEquals(result.usage, usage(units, usd));
        }
        await assertRejects(() =>
            runYouTubeBody(
                type,
                { pages: 25, recentVideosLimit: 13 },
                youtubeOutput(type, 14),
            )
        );
    }
});

Deno.test("refetcher YouTube pages: fewer uploads and metadata-only requests settle the delivered amount", async () => {
    for (const type of ["channel", "channelVideos"] as const) {
        for (const [count, units, usd] of [[13, 2, 0.0018], [0, 1, 0.0009]]) {
            const { estimate, result } = await runYouTubeBody(
                type,
                { pages: 25 },
                youtubeOutput(type, count),
            );
            assertEquals(estimate, usage(25, 0.0225));
            assertEquals(result.usage, usage(units, usd));
        }
    }
    const { estimate, result } = await runYouTubeBody(
        "channel",
        { pages: 25, includeRecentVideos: false },
        youtubeOutput("channel", 0),
    );
    assertEquals(estimate, usage(1, 0.0009));
    assertEquals(result.usage, usage(1, 0.0009));
});

Deno.test("refetcher YouTube pages: failed targets and HTTP errors release the page estimate", async () => {
    for (const type of ["channel", "channelVideos"] as const) {
        for (const status of [200, 502]) {
            const { estimate, result } = await runYouTubeBody(
                type,
                { pages: 25 },
                {
                    success: false,
                    results: [{ success: false, error: "synthetic_failure" }],
                },
                status,
            );
            assertEquals(estimate, usage(25, 0.0225));
            assertEquals(result.usage.credits, {});
            assertEquals(result.usage.evidence.RESULT ?? 0, 0);
        }
    }
});

Deno.test("refetcher YouTube pages: responses above the requested page depth are rejected", async () => {
    for (const type of ["channel", "channelVideos"] as const) {
        await assertRejects(() =>
            runYouTubeBody(type, { pages: 2 }, youtubeOutput(type, 25))
        );
        await assertRejects(() =>
            runYouTubeBody(type, { pages: 25 }, youtubeOutput(type, 301))
        );
    }
});
