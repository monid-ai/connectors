import { z } from "zod";

/** `{qrn}` path parameter of the device routes. */
export const zDeviceQrnPathParams = z.object({
    qrn: z.string().min(1).max(255).describe(
        "Device QRN, e.g. aws:aws:sim:sv1 or ibm:ibm:qpu:fez (from " +
            "qbraid#list-devices).",
    ),
});
