import { defineEndpoint } from "@shared/core";
import { zQasmBody } from "../../schema/qasm.ts";

/** POST /composer/validate — validate OpenQASM */
export default defineEndpoint({
    meta: {
        displayName: "Validate OpenQASM",
        summary: "Check an OpenQASM program is well-formed and get its shape.",
        description: "Check whether an OpenQASM program is well-formed, " +
            "and get its shape. Returns valid true/false, a list of " +
            "human-readable errors when it is not, and stats: numQubits, " +
            "numClbits, depth and gateCount. USE THIS BEFORE " +
            "qbraid#submit-job — a malformed program that reaches a real " +
            "device wastes credits and queue position, and this call " +
            "costs nothing. The stats are also the fastest way to answer " +
            "'how big is this circuit' or to check it fits a device's " +
            "qubit count from qbraid#list-devices. Purely computational: " +
            "nothing is saved and no device is contacted. Free.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
    },
    endpoint: "/validate-qasm",
    request: { method: "POST", path: "/composer/validate" },
    input: { schema: { body: zQasmBody } },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
});
