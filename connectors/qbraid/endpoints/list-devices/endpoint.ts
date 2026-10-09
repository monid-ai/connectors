import { defineEndpoint } from "@shared/core";
import { zListDevicesQueryParams } from "./schema/inputs.ts";

/** GET /devices — list devices */
export default defineEndpoint({
    meta: {
        displayName: "List Quantum Devices",
        summary: "List the QPUs and simulators available to your account.",
        description: "List the quantum devices — QPUs and simulators — " +
            "your qBraid key can see, with status, qubit count, supported " +
            "program formats (runInputTypes), shot limits, pricing " +
            "(perTask / perShot / perMinute, in qBraid credits) and " +
            "provider. Filter by deviceType, status, vendor, providerId or " +
            "free-text search; sort and paginate (limit up to 100). Start " +
            "here to pick a target for qbraid#submit-job: the device's " +
            "qrn is the handle every other device and job endpoint takes. " +
            "Each device carries its current status (ONLINE, OFFLINE, " +
            "UNAVAILABLE, RETIRED) and, when unavailable, nextAvailable — " +
            "but status alone says nothing about quality: for which QPU " +
            "or which qubits are actually good right now, read " +
            "qbraid#get-device-calibration. Free.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
    },
    endpoint: "/list-devices",
    request: { method: "GET", path: "/devices" },
    input: { schema: { queryParams: zListDevicesQueryParams } },
});
