import { z } from "zod";

export const zPieterPostIdempotencyKey = z.string().min(1).max(140).describe(
    "Stable key for this create operation. Reuse the same key after a timeout " +
        "so PieterPost returns the original resource instead of creating a duplicate.",
);

export const zPieterPostLocale = z.enum([
    "de",
    "en",
    "es",
    "fr",
    "it",
    "nl",
    "pl",
    "pt",
]);

export const zPieterPostMetadata = z.record(
    z.string().min(1).max(40),
    z.union([z.string().max(200), z.number(), z.boolean()]),
).describe(
    "Optional correlation metadata. PieterPost keeps at most 20 primitive entries.",
);

export const zPieterPostAssetId = z.string().min(1).max(140).describe(
    "Asset id returned by POST /v1/uploads.",
);

export const zPieterPostRecipient = z.object({
    name: z.string().min(1).max(140).describe("Recipient name."),
    addressLines: z.array(z.string().min(1).max(140)).min(1).max(4)
        .optional().describe(
            "Preformatted address lines, excluding the recipient name. " +
                "Use these or the structured address fields.",
        ),
    streetAddress: z.string().min(1).max(140).optional().describe(
        "Complete street and house-number line when addressLines is omitted.",
    ),
    street: z.string().min(1).max(140).optional(),
    number: z.string().min(1).max(140).optional(),
    postalCode: z.string().min(1).max(140).optional(),
    city: z.string().min(1).max(140).optional(),
    state: z.string().min(1).max(140).optional().describe(
        "State or region when required by the destination country.",
    ),
    country: z.string().min(2).max(140).optional().describe(
        "Destination country name or ISO code.",
    ),
    extra: z.string().min(1).max(140).optional().describe(
        "Optional company, unit, department, or other delivery line.",
    ),
    id: z.string().min(1).max(140).optional().describe(
        "Optional caller-side recipient identifier.",
    ),
    customFields: z.record(z.string(), z.string()).optional().describe(
        "Optional template values retained with the recipient.",
    ),
}).strict();

export const zPieterPostLetter = z.object({
    attachments: z.array(zPieterPostAssetId).min(1).optional().describe(
        "Uploaded letter-attachment asset ids. A letter requires text, attachments, or both.",
    ),
    message: z.string().max(6_000).optional().describe(
        "Optional letter text. Newlines are preserved.",
    ),
    recipient: zPieterPostRecipient,
}).strict();

const zPieterPostSinglePostcard = z.object({
    composeMode: z.enum(["personal", "template"]).optional(),
    frontImageAssetId: zPieterPostAssetId.optional().describe(
        "Optional square postcard-image upload; PieterPost uses its default front when omitted.",
    ),
    message: z.string().min(1).max(1_200).describe("Postcard message."),
    recipient: zPieterPostRecipient,
    variableKeys: z.array(z.string().min(1).max(40)).max(25).optional(),
}).strict();

const zPieterPostBulkPostcard = z.object({
    composeMode: z.enum(["personal", "template"]).optional(),
    frontImageAssetId: zPieterPostAssetId.optional().describe(
        "Optional square postcard-image upload; PieterPost uses its default front when omitted.",
    ),
    message: z.string().min(1).max(1_200).describe(
        "Shared postcard message for every recipient.",
    ),
    recipients: z.array(zPieterPostRecipient).min(1).max(25),
    variableKeys: z.array(z.string().min(1).max(40)).max(25).optional(),
}).strict();

export const zPieterPostPostcard = z.union([
    zPieterPostSinglePostcard,
    zPieterPostBulkPostcard,
]);

export const zPieterPostCheckoutCommon = {
    acceptUsAddressWarnings: z.boolean().optional().describe(
        "Set true only after reviewing and accepting US unit/address warnings " +
            "returned by a previous request.",
    ),
    externalId: z.string().min(1).max(140).optional().describe(
        "Optional caller-side order identifier.",
    ),
    idempotencyKey: zPieterPostIdempotencyKey,
    locale: zPieterPostLocale.optional(),
    metadata: zPieterPostMetadata.optional(),
    paymentMethod: z.enum(["auto", "card", "ideal"]).optional().describe(
        "Hosted checkout payment method. auto is recommended; ideal is only " +
            "available for EUR orders.",
    ),
    returnUrl: z.string().url().describe(
        "URL that receives checkout=success or checkout=cancelled.",
    ),
    senderEmail: z.string().email().describe(
        "Email address used for the hosted checkout and order contact.",
    ),
};

export const zPieterPostDirectOrderCommon = {
    acceptUsAddressWarnings: z.boolean().optional().describe(
        "Set true only after reviewing and accepting US unit/address warnings " +
            "returned by a previous request.",
    ),
    externalId: z.string().min(1).max(140).optional().describe(
        "Optional caller-side order identifier.",
    ),
    idempotencyKey: zPieterPostIdempotencyKey,
    locale: zPieterPostLocale.optional(),
    metadata: zPieterPostMetadata.optional(),
    senderEmail: z.string().email().optional().describe(
        "Optional email address used as the order contact.",
    ),
};

export const zPieterPostLetterRequestFields = {
    composeMode: z.enum(["personal", "template"]).optional().describe(
        "Use template with templateMessage and recipient customFields for bulk personalization.",
    ),
    letters: z.array(zPieterPostLetter).min(1).max(25).describe(
        "Letters for 1-25 recipients. Each letter requires text, attachments, or a template message.",
    ),
    stampImageAssetId: zPieterPostAssetId.optional().describe(
        "Optional uploaded letter-stamp-image; overrides the saved Business logo.",
    ),
    templateMessage: z.string().min(1).max(6_000).optional().describe(
        "Shared message with template variables for template compose mode.",
    ),
    useBusinessLogo: z.boolean().optional().describe(
        "Use the account's saved Business logo when no stampImageAssetId is supplied.",
    ),
    variableKeys: z.array(z.string().min(1).max(40)).max(25).optional(),
};
