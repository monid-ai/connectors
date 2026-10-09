import { z } from "zod";

/** GET /jobs/cost-estimate query — qbraid-api job/shared/validators.ts
 *  `quantumJobSchemas.costEstimate`. `shots` is a string on the wire; the
 *  engine stringifies the integer. */
export const zEstimateJobCostQueryParams = z.object({
    deviceQrn: z.string().min(1).describe(
        "The device QRN to price against, from qbraid#list-devices. " +
            "Pricing is per-device, so an estimate for one device says " +
            "nothing about another.",
    ),
    shots: z.number().int().min(1).describe(
        "Number of shots. Cost usually scales with this, so pass the SAME " +
            "value you intend to submit with or the estimate is meaningless.",
    ).optional(),
});
