import { defineEndpoint } from "@shared/core";
import { zQasmBody } from "../../schema/qasm.ts";

/** POST /composer/simulate — simulate circuit */
export default defineEndpoint({
    meta: {
        displayName: "Simulate Circuit",
        summary: "Exact probabilities from qBraid's free state-vector " +
            "simulator (20 qubits max).",
        description: "Run an OpenQASM program on qBraid's built-in " +
            "state-vector simulator and get the output probability " +
            "distribution keyed by bitstring (probabilities), the qubit " +
            "count (num_qubits) and per-qubit states (prob, phase, " +
            "purity). Results may be served from a cache. This spends no " +
            "credits and never touches a QPU, so use it to show a user " +
            "what their circuit does before proposing qbraid#submit-job, " +
            "which does cost money. HARD LIMIT OF 20 QUBITS: a larger " +
            "circuit is rejected outright — for those, submit to a " +
            "simulator device from qbraid#list-devices instead. Results " +
            "are exact probabilities, not sampled shot counts, so they " +
            "will not match a hardware run's statistical noise. Free.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
        notes: [
            "Programs declaring more than 20 qubits are rejected with 400 " +
            "before any simulation runs.",
        ],
    },
    endpoint: "/simulate-circuit",
    request: { method: "POST", path: "/composer/simulate" },
    input: { schema: { body: zQasmBody } },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
});
