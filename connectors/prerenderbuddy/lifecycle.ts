import type { LifecyclePollFn, LifecycleStartFn } from "@shared/core";

// Closed terms: all IO goes through the engine, credentials stay at egress.
// Shared by the four answer endpoints; free readers inherit NO lifecycle.
export const startAnswer: LifecycleStartFn = async ({ data, utils }) => {
    const res = await utils.request({
        headers: { "Idempotency-Key": data.run.runId + ":answer" },
    });
    if (res.status < 200 || res.status >= 300) {
        return { kind: "COMPLETED", httpStatus: res.status, output: res.body };
    }
    const jobId = utils.json.optionalGet(res.body, "$.jobId");
    const status = utils.json.optionalGet(res.body, "$.status");
    const platform = utils.json.optionalGet(res.body, "$.platform");
    if (
        typeof jobId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            jobId,
        ) ||
        platform !== data.request.url.split("/").pop()
    ) {
        return {
            kind: "COMPLETED",
            httpStatus: 502,
            providerHttpStatus: res.status,
            output: {
                error: {
                    code: "invalid_job",
                    message: "PB returned an invalid job receipt.",
                },
            },
        };
    }
    if (status === "completed") {
        const answer = utils.json.optionalGet(res.body, "$.result.answer");
        const charged = utils.json.optionalNum(
            res.body,
            "$.billing.chargedUsd",
        );
        const currency = utils.json.optionalGet(res.body, "$.billing.currency");
        if (
            typeof answer !== "string" || answer.trim() === "" ||
            currency !== "USD" || charged === undefined ||
            !Number.isFinite(charged) || charged <= 0
        ) {
            return {
                kind: "COMPLETED",
                httpStatus: 502,
                providerHttpStatus: res.status,
                output: {
                    error: {
                        code: "invalid_answer",
                        message:
                            "PB returned an incomplete answer or billing receipt.",
                    },
                },
            };
        }
        return { kind: "COMPLETED", httpStatus: 200, output: res.body };
    }
    if (status === "failed") {
        return {
            kind: "COMPLETED",
            httpStatus: 500,
            providerHttpStatus: res.status,
            output: res.body,
        };
    }
    if (status !== "queued" && status !== "running" && status !== "submitted") {
        return {
            kind: "COMPLETED",
            httpStatus: 502,
            providerHttpStatus: res.status,
            output: {
                error: {
                    code: "invalid_status",
                    message: "PB returned an unknown job status.",
                },
            },
        };
    }
    const seconds = utils.json.optionalNum(res.body, "$.pollAfterSeconds");
    return {
        kind: "RUNNING",
        state: { externalRunId: jobId },
        ...(seconds !== undefined && Number.isFinite(seconds)
            ? { pollAfterMs: Math.min(60, Math.max(5, seconds)) * 1000 }
            : {}),
    };
};

export const pollAnswer: LifecyclePollFn = async ({ data, utils }) => {
    const jobId = data.lifecycle.state.externalRunId;
    if (jobId === undefined) throw new Error("PB poll requires externalRunId.");
    const res = await utils.http({
        method: "GET",
        url: data.request.url.split("/answers/")[0] + "/jobs/" +
            encodeURIComponent(jobId),
    });
    // A failed lookup does not prove the job failed. Retain its id and retry
    // within the 24-hour run budget instead of abandoning billable work.
    if (res.status === 408 || res.status === 429 || res.status >= 500) {
        return { kind: "RUNNING", pollAfterMs: 60_000 };
    }
    if (res.status < 200 || res.status >= 300) {
        return { kind: "COMPLETED", httpStatus: res.status, output: res.body };
    }
    const returnedId = utils.json.optionalGet(res.body, "$.jobId");
    const platform = utils.json.optionalGet(res.body, "$.platform");
    if (
        returnedId !== jobId || platform !== data.request.url.split("/").pop()
    ) {
        return {
            kind: "COMPLETED",
            httpStatus: 502,
            providerHttpStatus: res.status,
            output: {
                error: {
                    code: "invalid_job",
                    message: "PB returned a different job receipt.",
                },
            },
        };
    }
    const status = utils.json.optionalGet(res.body, "$.status");
    if (status === "queued" || status === "running" || status === "submitted") {
        const seconds = utils.json.optionalNum(res.body, "$.pollAfterSeconds");
        return {
            kind: "RUNNING",
            ...(seconds !== undefined && Number.isFinite(seconds)
                ? { pollAfterMs: Math.min(60, Math.max(5, seconds)) * 1000 }
                : {}),
        };
    }
    if (status === "failed") {
        return {
            kind: "COMPLETED",
            httpStatus: 500,
            providerHttpStatus: res.status,
            output: res.body,
        };
    }
    const answer = utils.json.optionalGet(res.body, "$.result.answer");
    const charged = utils.json.optionalNum(res.body, "$.billing.chargedUsd");
    const currency = utils.json.optionalGet(res.body, "$.billing.currency");
    if (
        status !== "completed" || typeof answer !== "string" ||
        answer.trim() === "" || currency !== "USD" || charged === undefined ||
        !Number.isFinite(charged) || charged <= 0
    ) {
        return {
            kind: "COMPLETED",
            httpStatus: 502,
            providerHttpStatus: res.status,
            output: {
                error: {
                    code: "invalid_answer",
                    message:
                        "PB returned an incomplete answer or billing receipt.",
                },
            },
        };
    }
    return { kind: "COMPLETED", httpStatus: 200, output: res.body };
};
