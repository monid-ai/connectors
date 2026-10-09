import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zCountry, zProvisionConnectionInput } from "../../../schema/common.ts";

/**
 * /provision-numbers — buy and hold a real US phone number (upstream:
 * `POST /numbers`), the resource lifecycle's CREATES anchor (design D32/
 * D37; v1 `numbers/provision-number.ts`).
 *
 * start runs the 4-call saga CONNECTION-FIRST: quote (`GET
 * /pricing/quote`, the consent basis) → create the REQUIRED connection
 * (`POST /connections` — fail fast, NO money moved) → buy the number
 * (`POST /numbers` with the consented cents; ONE `409 PriceChanged` retry
 * with the actual prices under a DISTINCT idempotency key) → bind (`POST
 * /numbers/{id}/connection`). Only a bind failure AFTER the paid purchase
 * degrades: the resource persists connection-less (repair via
 * /update-numbers), the orphan connection is best-effort deleted. All
 * writes carry `{runId}:<op>` idempotency keys so activity retries
 * converge upstream instead of buying a second number.
 */
export const zProvisionNumberBody = z.object({
    /** Per-numberType selector: `areaCode` exists ONLY for local numbers.
     *  Ordered union (not discriminated) so the local variant keeps the
     *  historical default: an omitted numberType still means local. */
    phoneNumber: z.union([
        z.object({
            numberType: z.literal("local").default("local"),
            areaCode: z.string().regex(/^\d{3}$/).optional().describe(
                "Preferred 3-digit area code (e.g. '415'). Local numbers " +
                    "only. Omit to take any available number.",
            ),
        }).strict(),
        z.object({ numberType: z.literal("toll_free") }).strict(),
    ]).default({ numberType: "local" }).describe(
        "Kind of number: local (geographic area code) or toll_free (8xx, " +
            "free for callers). Both are $2/month.",
    ),
    country: zCountry.default("US"),
    connection: zProvisionConnectionInput.describe(
        "The number's AI persona — REQUIRED. Created and attached " +
            "internally; update it later via /update-numbers.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Provision Phone Number",
        summary:
            "Buy a real US phone number (local or toll-free) with its AI persona; $2/month via the resource lifecycle.",
        description:
            "Buy a real US phone number (local or toll-free) and define " +
            "the AI persona behind it (the REQUIRED 'connection' block). " +
            "The number is provisioned to your workspace as an owned " +
            "resource renewing at $2/month until you release it: renewal " +
            "charges start 3 days before each paid-through date, and an " +
            "unpayable renewal releases the number exactly at the " +
            "paid-through date — you always keep what you paid for.",
        docsUrl: "https://saperly.com/docs/guides/numbers",
        categories: ["agentic-phone"],
        notes: [
            "Running this SPENDS MONEY: $2 for the first month (includes " +
            "the carrier setup fee), then $2/month on renewal.",
            "Release any time via /release-numbers; the number stays " +
            "usable until its paid-through date.",
            "Not a list — to SEE the numbers you already own, use " +
            "/list-numbers (free).",
        ],
    },
    endpoint: "/provision-numbers",
    request: { method: "POST", path: "/numbers" },
    input: { schema: { body: zProvisionNumberBody } },
    resources: {
        provisions: [{
            id: "saperly/phone-number",
            /**
             * PURE, post-success, on the RAW settle body — FORGIVING by v1
             * contract (the manageability minimum is the upstream id ALONE;
             * a missing phoneNumber degrades). A 2xx with NO readable id is
             * never "nothing provisioned" for a purchase — the THROW maps to
             * PROVISION_CONSTRUCT (host alarms; run stays uncharged
             * host-side).
             */
            seed: ({ data, utils }) => {
                const $ = utils.json;
                const out = data.output;
                const id = $.optionalStr(out, "$.id");
                if (id === undefined) {
                    throw new Error(
                        "saperly returned success but no readable number id",
                    );
                }
                const numberType = $.optionalStr(out, "$.numberType");
                const connection = $.optionalStr(out, "$.connection.id");
                const monthly = $.optionalNum(out, "$.monthlyPriceCents");
                const phoneNumber = $.optionalStr(out, "$.phoneNumber");
                return {
                    resource: "saperly/phone-number",
                    externalId: id,
                    identifier: phoneNumber ?? id,
                    data: {
                        country: $.optionalStr(out, "$.country") ??
                            $.optionalStr(data.input.body ?? {}, "$.country") ??
                            "US",
                        numberType: numberType === "toll_free"
                            ? "toll_free"
                            : "local",
                        ...(phoneNumber !== undefined ? { phoneNumber } : {}),
                        ...(connection !== undefined
                            ? { externalRefs: { connection } }
                            : {}),
                    },
                    // the QUOTED monthly — the host's sticky max-rule seed
                    ...(monthly !== undefined
                        ? {
                            observedUsage: {
                                rent: {
                                    credit: "default",
                                    amount: monthly / 100,
                                },
                            },
                        }
                        : {}),
                };
            },
        }],
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "number + first month",
            consumes: { credit: "default", amount: 2 },
        },
        /**
         * The CONSENTED quote is the claim (start stamped it onto the
         * success body precisely because it is not recomputable from
         * upstream data); the stamps are absorbed out of the output
         * here (D27 one-motion).
         */
        consolidate: ({ data, utils }) => {
            const $ = utils.json;
            const upfront = $.optionalNum(data.output, "$.quoteUpfrontCents");
            const credits: Record<string, number> = upfront !== undefined
                ? { default: upfront / 100 }
                : {};
            return {
                credits,
                output: $.omit(data.output, [
                    "quoteMonthlyCents",
                    "quoteUpfrontCents",
                ]),
            };
        },
    },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            const $ = utils.json;
            const body = data.input.body!;
            const key = (op: string) => data.run.runId + ":" + op;

            // 1. the QUOTE — the price we consent to (internal, never
            //    user-facing). The two cents fields are REQUIRED (consent
            //    math): a quote missing them fails closed as OUR 502
            //    error-as-data (theirs rides on providerHttpStatus).
            const quote = await utils.http({
                method: "GET",
                path: "/pricing/quote",
                queryParams: {
                    country: body.country,
                    numberType: body.phoneNumber.numberType,
                },
            });
            if (quote.status < 200 || quote.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: quote.status,
                    output: quote.body,
                };
            }
            let monthlyCents = $.optionalNum(
                quote.body,
                "$.customerMonthlyCents",
            );
            let upfrontCents = $.optionalNum(
                quote.body,
                "$.customerUpfrontCents",
            );
            if (monthlyCents === undefined || upfrontCents === undefined) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: quote.status,
                    output: {
                        code: "malformed_quote",
                        message: "Saperly quote response was not understood",
                    } as Json,
                };
            }

            // 2. the REQUIRED connection FIRST — before any money moves.
            //    A failure here fails fast as error-as-data: no number
            //    bought, run completed uncharged, no resource. (The wire
            //    body is the whitelisted persona mapping — mode pinned to
            //    "hosted", llm.kind to "managed"; nothing else can reach
            //    upstream.)
            const conn = body.connection;
            const created = await utils.http({
                method: "POST",
                path: "/connections",
                headers: { "Idempotency-Key": key("conn-create") },
                body: {
                    name: conn.name ?? "Monid connection",
                    mode: "hosted",
                    instructions: conn.instructions,
                    ...(conn.language !== undefined
                        ? { language: conn.language }
                        : {}),
                    ...(conn.tts !== undefined
                        ? { tts: { voiceId: conn.tts.voiceId } }
                        : {}),
                    ...(conn.llm !== undefined
                        ? { llm: { kind: "managed", model: conn.llm.model } }
                        : {}),
                    ...(conn.callControl !== undefined
                        ? {
                            callControl: {
                                ...(conn.callControl.endCall !== undefined
                                    ? { endCall: conn.callControl.endCall }
                                    : {}),
                                ...(conn.callControl.sendDtmf !== undefined
                                    ? { sendDtmf: conn.callControl.sendDtmf }
                                    : {}),
                            },
                        }
                        : {}),
                    ...(conn.complianceEnabled !== undefined
                        ? { complianceEnabled: conn.complianceEnabled }
                        : {}),
                    ...(conn.disclosure !== undefined
                        ? { disclosure: conn.disclosure }
                        : {}),
                    ...(conn.smsAutoReply !== undefined
                        ? { smsAutoReply: conn.smsAutoReply }
                        : {}),
                },
            });
            const connectionId = $.optionalStr(created.body, "$.id");
            if (
                created.status < 200 || created.status >= 300 ||
                connectionId === undefined
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: created.status,
                    output: created.body,
                };
            }

            // best-effort orphan hygiene — a failed delete NEVER masks
            // the original outcome (connections are free upstream)
            const deleteOrphan = async () => {
                try {
                    const del = await utils.http({
                        method: "DELETE",
                        path: "/connections/" + connectionId,
                        headers: {
                            "Idempotency-Key": connectionId + ":release",
                        },
                    });
                    if (
                        !(del.status >= 200 && del.status < 300) &&
                        del.status !== 404 && del.status !== 410
                    ) {
                        logger.warn("orphan connection cleanup failed", {
                            connectionId,
                            status: del.status,
                        });
                    }
                } catch (cleanupError) {
                    logger.warn("orphan connection cleanup threw", {
                        connectionId,
                        error: String(cleanupError),
                    });
                }
            };

            // 3. the PURCHASE with the consented cents; 4. ONE
            //    PriceChanged retry — the 409 carries the ALLOCATED
            //    number's real prices; the retry re-POSTs a DIFFERENT
            //    body so it must NOT share the first attempt's key.
            const purchase = (
                attemptKey: string,
                monthly: number,
                upfront: number,
            ) => utils.http({
                method: "POST",
                path: "/numbers",
                headers: { "Idempotency-Key": attemptKey },
                body: {
                    country: body.country,
                    numberType: body.phoneNumber.numberType,
                    ...("areaCode" in body.phoneNumber &&
                            body.phoneNumber.areaCode !== undefined
                        ? { areaCode: body.phoneNumber.areaCode }
                        : {}),
                    expectedMonthlyPriceCents: monthly,
                    expectedUpfrontPriceCents: upfront,
                },
            });
            let res = await purchase(
                key("purchase"),
                monthlyCents,
                upfrontCents,
            );
            if (res.status === 409) {
                const actualMonthly = $.optionalNum(
                    res.body,
                    "$.actualMonthlyPriceCents",
                );
                const actualUpfront = $.optionalNum(
                    res.body,
                    "$.actualUpfrontPriceCents",
                );
                if (
                    actualMonthly !== undefined && actualUpfront !== undefined
                ) {
                    logger.warn(
                        "saperly PriceChanged — one retry with actual prices",
                        { monthlyCents: actualMonthly },
                    );
                    monthlyCents = actualMonthly;
                    upfrontCents = actualUpfront;
                    res = await purchase(
                        key("purchase:pc"),
                        actualMonthly,
                        actualUpfront,
                    );
                }
            }

            const numberId = $.optionalStr(res.body, "$.id");
            if (res.status < 200 || res.status >= 300) {
                // purchase failed — the pre-created connection is an orphan
                await deleteOrphan();
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            if (numberId === undefined) {
                // a 2xx purchase with NO readable id: settle's seed will
                // throw PROVISION_CONSTRUCT (the alarm — the run stays
                // uncharged host-side), but a bind never happened, so
                // the pre-created connection is a plain orphan — delete
                // it instead of leaking it into the workspace.
                await deleteOrphan();
            }

            // 5. BIND the pre-created connection. The number is PAID —
            //    NO failure may escape this block: a definitive
            //    rejection degrades to a connection-less resource
            //    (repaired via /update-numbers) + orphan delete; an
            //    AMBIGUOUS outcome (5xx / a thrown transport — the bind
            //    may have committed upstream) is RECONCILED against the
            //    number record before any delete: a paid number must
            //    never point at a connection we destroyed. The error
            //    log IS the alarm.
            let bound = false;
            if (numberId !== undefined) {
                let ambiguous = false;
                try {
                    const bind = await utils.http({
                        method: "POST",
                        path: "/numbers/" + numberId + "/connection",
                        headers: { "Idempotency-Key": numberId + ":bind" },
                        body: { connectionId },
                    });
                    bound = bind.status >= 200 && bind.status < 300;
                    // a clean 4xx is the vendor REJECTING the bind; a
                    // 5xx proves nothing about whether it committed
                    ambiguous = !bound && bind.status >= 500;
                } catch (bindError) {
                    ambiguous = true;
                    logger.error(
                        "number bought but its connection bind THREW — " +
                            "outcome unknown; reconciling",
                        { numberId, error: String(bindError) },
                    );
                }
                if (!bound && ambiguous) {
                    // RECONCILE: the number record is the truth
                    try {
                        const check = await utils.http({
                            method: "GET",
                            path: "/numbers/" + numberId,
                        });
                        const attached = $.optionalStr(
                            check.body,
                            "$.connectionId",
                        );
                        if (attached === connectionId) {
                            // the failure lied — the bind committed
                            bound = true;
                        } else if (
                            check.status >= 200 && check.status < 300 &&
                            attached === undefined
                        ) {
                            // definitively unbound — safe to clean up
                            await deleteOrphan();
                        } else {
                            // inconclusive read (or a foreign
                            // connection): KEEP ours — a leaked free
                            // connection beats a dangling pointer
                            logger.error(
                                "bind outcome unresolved — connection " +
                                    "kept; repair via /update-numbers",
                                { numberId, connectionId },
                            );
                        }
                    } catch (reconcileError) {
                        logger.error(
                            "bind reconcile read THREW — connection " +
                                "kept; repair via /update-numbers",
                            {
                                numberId,
                                connectionId,
                                error: String(reconcileError),
                            },
                        );
                    }
                } else if (!bound) {
                    // definitive 4xx rejection — the orphan is safe to
                    // delete
                    await deleteOrphan();
                }
                if (!bound) {
                    logger.error(
                        "number provisioned without its connection — " +
                            "repair via /update-numbers",
                        { numberId },
                    );
                }
            }

            // 6. COMPLETED with the composed body: the raw connection
            //    response rides for the seed (the user-facing strip
            //    re-projects it); the consented quote is STAMPED for
            //    consolidate (not recomputable from upstream data).
            const composed = $.merge(res.body, {
                ...(bound ? { connection: created.body } : {}),
                ...(!bound && numberId !== undefined
                    ? { connectionError: "connection attach failed" }
                    : {}),
                quoteMonthlyCents: monthlyCents,
                quoteUpfrontCents: upfrontCents,
            });
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: composed,
            };
        },
    },
});
