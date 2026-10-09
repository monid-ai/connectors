import { z } from "zod";

/** One program — qbraid-api job/shared/validators.ts
 *  `ProgramValidationSchema`: `format` free-form, `data` any non-null (the
 *  refine mirrors `v.check(val !== null && val !== undefined)`; it compiles
 *  to nothing, so `required` is the wire-enforced half). */
const zProgram = z.object({
    format: z.string().min(1).describe(
        "Program format — must be one of the device's runInputTypes from " +
            "qbraid#get-device: qasm2, qasm3, quil, qir.ll, qir.bc, " +
            "ionq.circuit.v0, pulser.sequence, analog, problem, braket, " +
            "pyqir.",
    ),
    data: z.unknown().refine((value) => value !== null && value !== undefined)
        .describe(
            "The program: source text for text formats (OpenQASM, Quil, " +
                "QIR), a JSON object for structured ones (ionq.circuit.v0, " +
                "problem).",
        ),
});

/** POST /jobs body — `QuantumJobCreateValidationSchema` (D25 mirror). */
export const zSubmitJobBody = z.object({
    deviceQrn: z.string().min(1).describe(
        "Target device QRN from qbraid#list-devices, e.g. " +
            "qbraid:qbraid:sim:qir-sv (free simulator) or aws:aqt:qpu:ibex-q1.",
    ),
    shots: z.number().int().min(0).describe(
        "Number of shots (measurements). Within the device's minShots / " +
            "maxShots; cost scales with it.",
    ),
    program: z.union([zProgram, z.array(zProgram).min(1).max(2000)])
        .describe(
            "The program to run, or an array of programs to run as one " +
                "batch job (up to 2000 circuits).",
        ),
    name: z.string().describe('Optional job name, e.g. "Bell State Test".')
        .optional(),
    tags: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .describe("Free-form key/value tags for filtering jobs later.")
        .optional(),
    runtimeOptions: z.record(z.string(), z.unknown()).describe(
        "Device-specific runtime options, passed through to the provider.",
    ).optional(),
    groupJobQrn: z.string().describe(
        "Attach the job to an existing job group.",
    ).optional(),
});
