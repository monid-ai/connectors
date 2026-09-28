import type { LifecycleStartFn } from "@shared/core";

/** Stable host run identity is also the vendor idempotency key. No automatic
 * second purchase or payment fallback after an ambiguous transport failure. */
export const startOrder: LifecycleStartFn = async ({ data, utils }) => {
    const slug = data.request.url.split("/").pop();
    const prices = [
        ["context-window-collins", 50],
        ["hallucination-highball", 250],
        ["recursive-negroni", 1000],
        ["null-pointer-nightcap", 2500],
    ];
    const amount = prices.find((item) => item[0] === slug)?.[1];
    if (typeof amount !== "number") throw new Error("Unknown drink price.");
    const res = await utils.request({
        headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": data.run.runId,
            "X-TheAgentBar-Price-Minor": String(amount),
        },
    });
    if (res.status < 200 || res.status >= 300) {
        return { kind: "COMPLETED", httpStatus: res.status, output: res.body };
    }
    const $ = utils.json;
    if (
        res.status !== 200 ||
        $.optionalGet(res.body, "$.status") !== "fulfilled" ||
        $.optionalGet(res.body, "$.billing.mode") !== "partner_account" ||
        $.optionalGet(res.body, "$.billing.run_id") !== data.run.runId ||
        $.optionalGet(res.body, "$.billing.amount_minor") !== amount ||
        $.optionalGet(res.body, "$.billing.currency") !== "USD" ||
        $.optionalGet(res.body, "$.receipt.paymentMethod") !==
            "monid_partner_account" ||
        $.optionalGet(res.body, "$.receipt.currency") !== "USD" ||
        $.optionalGet(res.body, "$.receipt.amount") !==
            (amount / 100).toFixed(2) ||
        $.optionalGet(res.body, "$.receipt.drink") !== slug ||
        $.optionalGet(res.body, "$.experience.drink") !== slug ||
        $.optionalGet(res.body, "$.backbar_post.published") !== true ||
        ![
            "$.receipt.publicCode",
            "$.receipt.signature",
            "$.experience.text",
            "$.backbar_post.id",
        ].every((path) => {
            const value = $.optionalGet(res.body, path);
            return typeof value === "string" && value.length > 0;
        })
    ) {
        return {
            kind: "COMPLETED",
            httpStatus: 502,
            output: {
                error: "unconfirmed_fulfilment",
                message:
                    "Use the free get-order operation with the original nonce. Do not create another purchase.",
            },
        };
    }
    return { kind: "COMPLETED", httpStatus: 200, output: res.body };
};
