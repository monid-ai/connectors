import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * POST /v1/uploads — mint a 5-minute presigned S3 PUT URL for one photo.
 *
 * SYNC: one call, completed inline. The provider's ASYNC default would demand
 * a `job_id` this endpoint never returns, so `start` is overridden here with
 * the plain relay (design D3).
 *
 * No input at all — the vendor takes an empty body and the auth header.
 */
export default defineEndpoint({
    meta: {
        displayName: "Suzanne Image Upload URL",
        summary:
            "Mint a 5-minute presigned S3 PUT URL for uploading one JPEG/PNG photo.",
        description:
            "Get a 5-minute presigned S3 PUT URL for uploading a JPEG/PNG " +
            "photo directly to storage (no request body limits apply). " +
            "Takes no parameters. Returns " +
            "{ upload_id, upload_url, expires_at }. PUT the raw image bytes " +
            "to upload_url, then pass the upl_* upload_id to the Suzanne " +
            "photo-to-3d endpoint in images_upload_ids. Call once per view " +
            "(front/back/left/right).",
        // The v1 `notes` of this def, restored to a real slot (design D10):
        // operational caveats a caller must know BEFORE calling — not what
        // the endpoint is for, which is `description`'s job.
        notes: [
            "Do not send a Content-Type header on the PUT - the URL is " +
            "signed without one, so S3 answers 403 SignatureDoesNotMatch. " +
            'curl adds it by default; suppress with -H "Content-Type:".',
            "The PUT URL expires after 5 minutes. Uploaded objects may be up " +
            "to 20 MB and auto-expire after 7 days.",
        ],
        docsUrl: "https://console.suzanne3d.com/documentation/uploads",
        categories: ["3d-generation"],
    },
    request: { method: "POST", path: "/v1/uploads" },
    lifecycle: {
        /** The plain relay: one POST that completes inline. Non-2xx rides
         *  out as data (the engine zero-bills it); a transport failure
         *  throws EXECUTION_FAILED through the fn. */
        start: async ({ utils }) => {
            const res = await utils.request();
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        /** Flat per minted URL — the contract rate Suzanne bills us
         *  (v1 `unitPrice`, $0.01). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "upload url",
            consumes: { credit: "default", amount: 0.01 },
        },
    },
});
