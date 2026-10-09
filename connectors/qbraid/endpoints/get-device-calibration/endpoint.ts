import { defineEndpoint } from "@shared/core";
import { zDeviceQrnPathParams } from "../../schema/qrn.ts";

/** GET /devices/{qrn}/calibrations — get device calibration */
export default defineEndpoint({
    meta: {
        displayName: "Get Device Calibration",
        summary: "Latest calibration snapshot of a QPU: T1, T2, gate and " +
            "readout errors.",
        description: "The most recent calibration snapshot for a quantum " +
            "device: per-qubit T1, T2, frequency, readout error and gate " +
            "errors (qubits, keyed by qubit id), and per-edge two-qubit " +
            "gate errors (edges). THIS IS HOW YOU CHOOSE A DEVICE OR A " +
            "QUBIT SUBSET on quality rather than guessing — " +
            "qbraid#list-devices tells you what exists and is online, " +
            "only calibrations tell you which is actually good right now " +
            "and which qubits to avoid. Relevant when results are noisy, " +
            "when picking a machine, or when mapping a circuit. " +
            "Calibrations change over time (often daily), so re-read " +
            "rather than reuse an earlier answer. Real QPUs only: " +
            "simulators have no calibration data and answer 404. The full " +
            "per-qubit and per-edge maps are returned, so a 100+ qubit " +
            "QPU is a large payload. Free.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
    },
    endpoint: "/get-device-calibration",
    request: { method: "GET", path: "/devices/{qrn}/calibrations" },
    input: { schema: { pathParams: zDeviceQrnPathParams } },
});
