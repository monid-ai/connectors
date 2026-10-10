import { assert, assertEquals } from "@std/assert";
import type { Json } from "@shared/core";
import { loadFixture, runEndpoint, testSealedUnit } from "@shared/testing";

// These shared response shapes were recorded through the compiled connector
// on 2026-09-22. The provider tests separately cover all eleven wire bindings.
const recordings = [
    ["youtube/video", "recorded-post-success"],
    ["instagram/profile", "recorded-profile-success"],
    ["youtube/channel", "recorded-channel-success"],
    ["youtube/channel-videos", "recorded-channel-videos-success"],
] as const;

for (const [endpoint, name] of recordings) {
    Deno.test(`refetcher recorded success: ${endpoint}`, async () => {
        const fixture = await loadFixture(
            new URL(`./fixtures/${name}.json`, import.meta.url).pathname,
        );
        const result = await runEndpoint({
            unit: await testSealedUnit(`refetcher#${endpoint}`),
            input: { body: fixture.calls[0].req.body },
            mode: "replay",
            fixture,
        });
        assertEquals(result.httpStatus, 200);
        assertEquals(result.isProviderError, false);
        assertEquals(result.output, fixture.calls[0].res.body);
        // Nested uploads/posts still belong to one billable page.
        assertEquals(result.usage, {
            credits: { default: 0.0009 },
            evidence: { RESULT: 1 },
        });
        const output = result.output as Record<string, Json>;
        assert(Array.isArray(output.results));
        assertEquals(output.results.length, 1);
        const target = output.results[0] as Record<string, Json>;
        assertEquals(target.success, true);
        if (endpoint === "youtube/video") {
            const metrics = target.metrics as Record<string, Json>;
            assertEquals(metrics.shares, null);
            assertEquals(metrics.saves, null);
            const media = target.media as Record<string, Json>;
            assert(typeof media.thumbnailUrl === "string");
            assert(typeof media.embedUrl === "string");
            assertEquals(media.videoUrl, undefined);
        } else if (endpoint === "instagram/profile") {
            assert(Array.isArray(target.recentPosts));
            assert(target.recentPosts.length > 0);
            const pageInfo = target.pageInfo as Record<string, Json>;
            const posts = pageInfo.recentPosts as Record<string, Json>;
            assertEquals(posts.hasNextPage, true);
        } else if (endpoint === "youtube/channel") {
            assertEquals(target.type, "channel");
            assert(Array.isArray(target.recentVideos));
            assert(target.recentVideos.length > 0);
        } else {
            assertEquals(target.type, "channelVideos");
            assert(Array.isArray(target.videos));
            assert(target.videos.length > 0);
        }
    });
}
