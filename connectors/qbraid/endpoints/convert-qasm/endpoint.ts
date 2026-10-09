import { defineEndpoint } from "@shared/core";
import { zConvertQasmBody } from "./schema/inputs.ts";

/** POST /composer/convert — convert OpenQASM version */
export default defineEndpoint({
    meta: {
        displayName: "Convert OpenQASM Version",
        summary: "Translate a program between OpenQASM 2.0 and 3.0.",
        description: "Translate a program between OpenQASM 2.0 and 3.0 " +
            "and return the converted source (qasm), plus warnings for " +
            "anything that could not be expressed exactly in the target " +
            "version. READ THE WARNINGS BACK TO THE USER rather than " +
            "presenting the output as an equivalent program — a lossy " +
            "conversion is silent otherwise. Useful when a device's " +
            "runInputTypes (qbraid#get-device) or an SDK requires a " +
            "specific QASM version. Purely computational: the original is " +
            "not modified and nothing is stored. Free.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
    },
    endpoint: "/convert-qasm",
    request: { method: "POST", path: "/composer/convert" },
    input: { schema: { body: zConvertQasmBody } },
    timeouts: { requestMs: 60_000, runMs: 90_000 },
});
