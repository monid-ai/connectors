import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBowmarkRunBody } from "./schema/inputs.ts";

/**
 * POST /v1/run: execute a script against the live sites.
 *
 * Synchronous: Bowmark holds the request until the run finishes (its own
 * run ceiling is 120 s), so the timeouts sit just above that.
 *
 * Usage (design D2): PER_UNIT RESULT, one per run that produced a result
 * (`status` "ok" or "partial"). An `error` run, a `needs_user` pause and
 * every non-2xx bill 0.
 */
export default defineEndpoint({
    meta: {
        displayName: "Bowmark Run",
        summary:
            "Run a short script on live websites and get structured data back.",
        description: "Executes a JavaScript body against the `bowmark` " +
            "global on Bowmark's machines and returns `{ok, status, " +
            "result, logs, error, ms, runId}`. Call Bowmark /library " +
            "first for the exact function names. Branch on `status`, " +
            'not `ok`: "ok" is a whole answer; "partial" keeps ok ' +
            "true and a real `result` but `incomplete` names what did " +
            "not answer, so say the answer is narrower than asked; " +
            '"needs_user" means a site needs the account owner signed ' +
            "in (`meta.handoff.url` is the link for a human; send the " +
            'same script again afterwards); "error" means there is no ' +
            "result and `error` says why. `incomplete.failures[].fixable` " +
            "true means your argument was wrong: fix it and rerun. Keep " +
            "results small (under ~25,000 characters).",
        docsUrl: "https://bowmark.ai/docs/quickstart",
        categories: ["web-automation"],
        notes: [
            "Flat price per run that returns a result (status ok or " +
            "partial). A run that errors or pauses for a sign-in is free.",
        ],
    },
    request: { method: "POST", path: "/run" },
    input: {
        schema: {
            body: zBowmarkRunBody.extend({
                script: zBowmarkRunBody.shape.script.unwrap().min(1),
            }),
        },
    },
    timeouts: { requestMs: 130_000, runMs: 135_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs with a result",
            description: "runs that finished with status ok or partial",
            consumes: { credit: "default", amount: 0.04 },
        },
        /** The hold promises one run. */
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** 1 for a run whose `status` is "ok" or "partial", 0 otherwise
         *  (error, needs_user, or a body that is not an object). */
        evidence: ({ data }) => {
            const body = data.output;
            if (
                typeof body !== "object" || body === null ||
                Array.isArray(body)
            ) {
                return { counts: { RESULT: 0 } };
            }
            const status = (body as Record<string, unknown>).status;
            const done = status === "ok" || status === "partial";
            return { counts: { RESULT: done ? 1 : 0 } };
        },
    },
});
