import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zConnectionPatchInput, zNumberId } from "../../../schema/common.ts";

/**
 * /update-numbers — edit an owned number's AI persona in place (v1
 * `numbers/update-number.ts`). The connection id is INTERNAL: resolved
 * from the OWNED row's stored pointer, PATCHed in place. REPAIR paths
 * (create + bind, orphan-hygienic): (a) no stored pointer (partial
 * provision failure); (b) the stored pointer is STALE upstream (PATCH →
 * 404/410). Both require `instructions`. UPDATES binding: ownership
 * pre-gated; a success settle marks the row for the resource doc's
 * refresh (the pointer re-syncs — persona content is never persisted).
 */
export const zUpdateNumberBody = z.object({
    numberId: zNumberId.describe("The id of a phone number YOU OWN."),
    connection: zConnectionPatchInput.describe(
        "The persona fields to change; omitted fields keep their " +
            "current values.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Update Phone Number",
        summary:
            "Update an owned number's AI persona — instructions, voice, model, call controls, compliance.",
        description: "Update one of YOUR numbers in place — change its AI " +
            "persona: instructions (system prompt), name, language " +
            "(/list-languages), tts.voiceId (/list-voices), llm.model, " +
            "callControl, complianceEnabled + disclosure, or " +
            "smsAutoReply. The carrier re-syncs live lines.",
        docsUrl: "https://saperly.com/docs/guides/connections",
        categories: ["agentic-phone"],
    },
    endpoint: "/update-numbers",
    /** The repair-path route doubles as the anchor (the normal path
     *  PATCHes /connections/{ref}, whose id is not an input). */
    request: { method: "POST", path: "/numbers/{id}/connection" },
    input: {
        schema: { body: zUpdateNumberBody },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                id: String(
                    (data.input.body as Record<string, unknown>).numberId,
                ),
            },
        }),
    },
    resources: {
        updates: [{
            id: "saperly/phone-number",
            key: "$.body.numberId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            const $ = utils.json;
            const body = data.input.body!;
            const numberId = body.numberId;
            const key = (op: string) => data.run.runId + ":" + op;
            const rows = await utils.resources.owned({
                resource: "saperly/phone-number",
                externalId: numberId,
            });
            if (rows[0] === undefined) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 404,
                    output: {
                        code: "number_not_found",
                        message: "Number " + numberId + " not found",
                    } as Json,
                };
            }
            const stored = $.optionalStr(
                rows[0].data,
                "$.externalRefs.connection",
            );
            const conn = body.connection;
            const wire = {
                mode: "hosted",
                ...(conn.instructions !== undefined
                    ? { instructions: conn.instructions }
                    : {}),
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
            };

            /** Shared REPAIR: create + bind (restores the one-connection
             *  invariant); a bind failure deletes the unbound orphan. */
            const repair = async () => {
                if (conn.instructions === undefined) {
                    return {
                        kind: "COMPLETED" as const,
                        httpStatus: 409,
                        output: {
                            code: "connection_missing",
                            message: "This number has no connection yet — " +
                                "provide 'connection.instructions' to " +
                                "create one",
                        } as Json,
                    };
                }
                const created = await utils.http({
                    method: "POST",
                    path: "/connections",
                    headers: { "Idempotency-Key": key("repair-create") },
                    body: { name: conn.name ?? "Monid connection", ...wire },
                });
                const createdId = $.optionalStr(created.body, "$.id");
                if (
                    created.status < 200 || created.status >= 300 ||
                    createdId === undefined
                ) {
                    return {
                        kind: "COMPLETED" as const,
                        httpStatus: 502,
                        providerHttpStatus: created.status,
                        output: {
                            code: "connection_repair_failed",
                            message: "connection create failed",
                        } as Json,
                    };
                }
                const bind = await utils.http({
                    method: "POST",
                    path: "/numbers/" + numberId + "/connection",
                    headers: {
                        "Idempotency-Key": numberId + ":repair-bind",
                    },
                    body: { connectionId: createdId },
                });
                let bound = bind.status >= 200 && bind.status < 300;
                if (!bound && bind.status >= 500) {
                    // AMBIGUOUS: the Idempotency-Key makes RETRYING the
                    // bind safe — it does NOT make a delete safe (a 5xx
                    // may have committed upstream, and the number would
                    // then point at the connection we destroy).
                    // RECONCILE against the number record first.
                    const check = await utils.http({
                        method: "GET",
                        path: "/numbers/" + numberId,
                    });
                    bound = $.optionalStr(check.body, "$.connectionId") ===
                        createdId;
                    if (!bound) {
                        logger.error(
                            "repair bind outcome unresolved — connection " +
                                "kept (a leaked free connection beats a " +
                                "dangling pointer); retry /update-numbers",
                            { numberId, createdId },
                        );
                        return {
                            kind: "COMPLETED" as const,
                            httpStatus: 502,
                            providerHttpStatus: bind.status,
                            output: {
                                code: "connection_repair_failed",
                                message: "connection bind unresolved — " +
                                    "retry the update",
                            } as Json,
                        };
                    }
                }
                if (!bound) {
                    // a clean 4xx — the vendor definitively REJECTED the
                    // bind; the fresh connection is a plain orphan
                    try {
                        await utils.http({
                            method: "DELETE",
                            path: "/connections/" + createdId,
                            headers: {
                                "Idempotency-Key": createdId + ":release",
                            },
                        });
                    } catch (cleanupError) {
                        logger.warn("orphan connection cleanup threw", {
                            error: String(cleanupError),
                        });
                    }
                    return {
                        kind: "COMPLETED" as const,
                        httpStatus: 502,
                        providerHttpStatus: bind.status,
                        output: {
                            code: "connection_repair_failed",
                            message: "connection bind failed",
                        } as Json,
                    };
                }
                return {
                    kind: "COMPLETED" as const,
                    httpStatus: 200,
                    output: { numberId, status: "connection_created" } as Json,
                };
            };

            if (stored === undefined) return await repair();

            // normal path: PATCH in place. The internal connection id
            // never reaches users — a lean ack replaces the body.
            const res = await utils.http({
                method: "PATCH",
                path: "/connections/" + stored,
                headers: { "Idempotency-Key": key("conn-patch") },
                body: {
                    ...(conn.name !== undefined ? { name: conn.name } : {}),
                    ...wire,
                },
            });
            if (res.status >= 200 && res.status < 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: { numberId, status: "updated" } as Json,
                };
            }
            if (res.status === 404 || res.status === 410) {
                // STALE stored pointer — restore the invariant right here
                logger.warn(
                    "stored connection is gone upstream — repairing",
                    { numberId },
                );
                return await repair();
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
