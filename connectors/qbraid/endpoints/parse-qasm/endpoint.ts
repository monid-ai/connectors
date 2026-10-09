import { defineEndpoint } from "@shared/core";
import { zQasmBody } from "../../schema/qasm.ts";

/** POST /composer/parse — parse OpenQASM */
export default defineEndpoint({
    meta: {
        displayName: "Parse OpenQASM",
        summary: "Turn OpenQASM into a structured gate list.",
        description: "Turn an OpenQASM program into a structured circuit " +
            "description: qubit and classical-bit counts plus a gate " +
            "list, each gate carrying its type, target qubits, controls, " +
            "parameters and column position. Use this when you need to " +
            "REASON ABOUT or MODIFY the circuit programmatically — " +
            "counting gates of a type, finding what acts on a qubit, or " +
            "describing the structure to the user. If you only need to " +
            "know whether it is valid, qbraid#validate-qasm is cheaper " +
            "and clearer. Also returns warnings for constructs that parsed " +
            "but are suspect. Purely computational. Free.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
    },
    endpoint: "/parse-qasm",
    request: { method: "POST", path: "/composer/parse" },
    input: { schema: { body: zQasmBody } },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
});
