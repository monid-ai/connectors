import { assert, assertEquals } from "@std/assert";
import { walk } from "@std/fs";
import { fromFileUrl, join, relative } from "@std/path";
import { trimCalls, trimJson } from "./fixtures.ts";

/**
 * FIXTURE-SIZE LINT (fixture-diet policy, design D11 of
 * add-async-run-protocol): fixtures are TRIMMED recordings — the wire chain
 * is real, the payload bulk is capped at record time. This lint bounds the
 * files so untrimmed recordings (or bloated synthetics) cannot land:
 * warn > 32 KiB, fail > 128 KiB. Over the warn line? Re-record (trim is the
 * default) or run the trim over the existing recording.
 */
const WARN_BYTES = 32 * 1024;
const FAIL_BYTES = 128 * 1024;

const REPO_ROOT = fromFileUrl(new URL("../../", import.meta.url));

Deno.test("fixture-size lint: fixtures stay trimmed (warn 32KiB, fail 128KiB)", async () => {
    const failures: string[] = [];
    for await (
        const entry of walk(join(REPO_ROOT, "connectors"), {
            includeDirs: false,
            exts: [".json"],
            match: [/fixtures/],
        })
    ) {
        const bytes = (await Deno.stat(entry.path)).size;
        const where = relative(REPO_ROOT, entry.path);
        if (bytes > FAIL_BYTES) {
            failures.push(`${where}: ${bytes} bytes > ${FAIL_BYTES}`);
        } else if (bytes > WARN_BYTES) {
            console.warn(
                `[fixture-size] WARN ${where}: ${bytes} bytes > ${WARN_BYTES} — ` +
                    `consider re-recording (trim is the default)`,
            );
        }
    }
    assert(
        failures.length === 0,
        `untrimmed fixtures (re-record, or apply trimCalls):\n${
            failures.join("\n")
        }`,
    );
});

Deno.test("trimJson: arrays capped, long strings truncated, structure/keys intact", () => {
    const long = "x".repeat(600);
    assertEquals(
        trimJson({
            items: [1, 2, 3, 4],
            nested: { deep: [{ text: long }, "b", "c"] },
            short: "ok",
            n: 5,
            none: null,
        }),
        {
            items: [1, 2],
            nested: { deep: [{ text: "x".repeat(500) }, "b"] },
            short: "ok",
            n: 5,
            none: null,
        },
    );
});

Deno.test("trimCalls: responses trimmed, the wire chain (requests/statuses) untouched", () => {
    const calls = [{
        req: {
            method: "POST",
            url: "https://api.test/jobs",
            body: { many: [1, 2, 3, 4, 5] }, // request bodies are NEVER trimmed
        },
        res: { status: 201, body: { rows: [1, 2, 3, 4, 5] } },
    }];
    assertEquals(trimCalls(calls), [{
        req: {
            method: "POST",
            url: "https://api.test/jobs",
            body: { many: [1, 2, 3, 4, 5] },
        },
        res: { status: 201, body: { rows: [1, 2] } },
    }]);
});
