import { defineEndpoint } from "@shared/core";
import { zDeviceQrnPathParams } from "../../schema/qrn.ts";

/** GET /devices/{qrn} — get device */
export default defineEndpoint({
    meta: {
        displayName: "Get Quantum Device",
        summary: "One device by QRN: specs, availability, formats, pricing.",
        description: "Get one quantum device by QRN: specs (numberQubits, " +
            "paradigm, modality, topology), availability (status, " +
            "statusMsg, queueDepth, avgQueueTime, nextAvailable), " +
            "minShots / maxShots, runInputTypes — the program formats " +
            "qbraid#submit-job accepts for it — and pricing in qBraid " +
            "credits. Use it to confirm a device takes your program format " +
            "and shot count before submitting. Free; 404 when the QRN is " +
            "unknown or not visible to your account.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
    },
    endpoint: "/get-device",
    request: { method: "GET", path: "/devices/{qrn}" },
    input: { schema: { pathParams: zDeviceQrnPathParams } },
});
