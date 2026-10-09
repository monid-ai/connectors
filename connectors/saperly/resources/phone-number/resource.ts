import { z } from "zod";
import { defineResource } from "@shared/core";
import {
    zConnectionPatchInput,
    zCountry,
    zNumberId,
    zProvisionConnectionInput,
} from "../../schema/common.ts";

/**
 * saperly/phone-number — a rented US phone number with its AI persona,
 * ported from monid-services `adaptors/saperly/resources/phone-number.ts`
 * (the v1 renewable `phone_number` resource), refined per
 * refine-resource-model (D39–D42).
 *
 * USAGE (the rate card, design D39): one FIXED line — $2 per MONTH,
 * CREATION_TIME-anchored, flat (confirmed against the live OpenAPI spec:
 * no proration, no refunds). Charge/release leads are HOST config, not
 * def data. No estimated lines — a phone number has no dynamic cost
 * stream to reconcile.
 *
 * CONNECTION POINTER POLICY (v1 refresh doc, carried verbatim):
 * `externalRefs.connection` is AUTHORITATIVE from upstream — a refresh
 * that reads no connectionId CLEARS the stored pointer (a stale internal
 * id must never survive); phoneNumber/country/numberType carry forward on
 * degraded reads (a live number's E.164 does not vanish).
 */
export default defineResource({
    slug: "phone-number",
    meta: {
        displayName: "Phone Number",
        summary: "A rented US phone number with its AI persona.",
        description:
            "A real US phone number (local or toll-free) owned by this " +
            "workspace, with an AI persona (Saperly connection) answering " +
            "and placing its calls. $2/month flat; release any time — the " +
            "number stays usable until its paid-through date.",
        docsUrl: "https://saperly.com/docs/guides/numbers",
    },
    data: z.strictObject({
        /** E.164 — may lag a degraded provision read; refresh converges. */
        phoneNumber: z.string().optional(),
        country: z.string(),
        numberType: z.enum(["local", "toll_free"]),
        /** ONLY the pointer persists — persona CONTENT is read live via
         *  the `connection` view (it can never go stale). */
        externalRefs: z.strictObject({
            connection: z.string().min(1),
        }).optional(),
    }),
    /** CATALOG-ONLY shapes of the user actions; the EXECUTABLE contracts
     *  live on the bound endpoints (compile-checked supersets). */
    inputs: {
        create: z.object({
            country: zCountry.default("US"),
            connection: zProvisionConnectionInput,
        }),
        /** `connection` optional HERE (catalog shape): TWO endpoints bind
         *  updates — /update-numbers (the persona edit, which requires a
         *  connection patch on its OWN contract) and /sync-numbers (the
         *  webhook-driven re-sync, which takes only the id). */
        update: z.object({
            numberId: zNumberId,
            connection: zConnectionPatchInput.optional(),
        }),
        release: z.object({ numberId: zNumberId }),
    },
    usage: {
        period: { unit: "MONTH", count: 1, anchor: "CREATION_TIME" },
        lines: {
            rent: { consumes: { credit: "default", amount: 2 } },
        },
    },
    lifecycle: {
        /**
         * verify (v1's word): `GET /numbers/{id}` aliveness before every
         * charge. 404 / releasedAt ⇒ inactive (attributable reason — an
         * inactive verdict triggers an irreversible release); other
         * non-2xx THROWS (retriable — the charge attempt retries; never
         * conclude from a flaky read). Returns the vendor's current
         * monthly draw for the `rent` line (the host's drift/max-rule
         * channel) and its own period end (reconciliation signal only).
         */
        verify: async ({ data, utils }) => {
            const $ = utils.json;
            const res = await utils.http({
                method: "GET",
                path: "/numbers/" + data.resource.externalId,
            });
            if (res.status === 404) {
                return { active: false, inactiveReason: "http_404" };
            }
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "saperly number verify failed with HTTP " + res.status,
                );
            }
            const releasedAt = $.optionalStr(res.body, "$.releasedAt");
            if (releasedAt !== undefined) {
                return {
                    active: false,
                    inactiveReason: "released_at:" + releasedAt,
                };
            }
            const cents = $.optionalNum(res.body, "$.monthlyPriceCents");
            const periodEnd = $.optionalStr(res.body, "$.nextChargeAt");
            return {
                active: true,
                ...(periodEnd !== undefined ? { periodEndIso: periodEnd } : {}),
                ...(cents !== undefined
                    ? {
                        observedUsage: {
                            rent: {
                                credit: "default",
                                amount: cents / 100,
                            },
                        },
                    }
                    : {}),
            };
        },
        /**
         * release (v1): `POST /numbers/{id}/release`, idempotent —
         * 404/410 tolerated as success, stable per-resource
         * Idempotency-Key so retries converge. The number's EMBEDDED
         * connection dies with it: a failed connection delete THROWS
         * (retriable) so the activity re-runs instead of faking RELEASED
         * over an orphaned persona.
         */
        release: async ({ data, utils }) => {
            const gone = (status: number) => status === 404 || status === 410;
            const rel = await utils.http({
                method: "POST",
                path: "/numbers/" + data.resource.externalId + "/release",
                headers: {
                    "Idempotency-Key": data.resource.externalId + ":release",
                },
                body: {},
            });
            if (!(rel.status >= 200 && rel.status < 300) && !gone(rel.status)) {
                throw new Error(
                    "saperly number release failed with HTTP " + rel.status,
                );
            }
            const connection = data.resource.data.externalRefs?.connection;
            if (connection !== undefined) {
                const del = await utils.http({
                    method: "DELETE",
                    path: "/connections/" + connection,
                    headers: {
                        "Idempotency-Key": connection + ":release",
                    },
                });
                if (
                    !(del.status >= 200 && del.status < 300) &&
                    !gone(del.status)
                ) {
                    throw new Error(
                        "saperly connection delete failed with HTTP " +
                            del.status + " on number release",
                    );
                }
            }
            return { released: true };
        },
        /**
         * refresh (v1): re-read the number and return the FULL data-field
         * patch. phoneNumber/country/numberType carry forward on degraded
         * reads; the connection POINTER is AUTHORITATIVE — absence
         * upstream CLEARS it. 404 ⇒ inactive (no patch); other non-2xx
         * THROWS (never silently blank the copy).
         */
        refresh: async ({ data, utils }) => {
            const $ = utils.json;
            const res = await utils.http({
                method: "GET",
                path: "/numbers/" + data.resource.externalId,
            });
            if (res.status === 404) return { active: false };
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "saperly number refresh failed with HTTP " + res.status,
                );
            }
            const connection = $.optionalStr(res.body, "$.connectionId");
            const phoneNumber = $.optionalStr(res.body, "$.phoneNumber") ??
                data.resource.data.phoneNumber;
            const numberType = $.optionalStr(res.body, "$.numberType");
            return {
                active: true,
                patch: {
                    country: $.optionalStr(res.body, "$.country") ??
                        data.resource.data.country,
                    numberType:
                        numberType === "toll_free" || numberType === "local"
                            ? numberType
                            : data.resource.data.numberType,
                    ...(phoneNumber !== undefined ? { phoneNumber } : {}),
                    // absence upstream CLEARS the pointer (authoritative)
                    ...(connection !== undefined
                        ? { externalRefs: { connection } }
                        : {}),
                },
            };
        },
    },
    views: {
        /**
         * The number's LIVE persona (design D42; v1
         * externalKinds.connection.inspect) — fetched fresh on every
         * read, SANITIZED through the allowlist (never
         * `id`/`manualSecret`/`mcpServers`).
         */
        connection: {
            label: "Connection",
            read: async ({ data, utils }) => {
                const $ = utils.json;
                const ref = data.resource.data.externalRefs?.connection;
                if (ref === undefined) return { connection: null };
                const res = await utils.http({
                    method: "GET",
                    path: "/connections/" + ref,
                });
                if (res.status < 200 || res.status >= 300) {
                    throw new Error(
                        "saperly connection read failed with HTTP " +
                            res.status,
                    );
                }
                return {
                    connection: $.pick(res.body, [
                        "$.name",
                        "$.mode",
                        "$.instructions",
                        "$.language",
                        "$.tts",
                        "$.llm",
                        "$.callControl",
                        "$.complianceEnabled",
                        "$.disclosure",
                        "$.smsAutoReply",
                        "$.recordingEnabled",
                    ]),
                };
            },
        },
    },
});
