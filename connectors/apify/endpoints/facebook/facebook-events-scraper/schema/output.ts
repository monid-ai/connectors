import { z } from "zod";

/**
 * apify/facebook-events-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zFacebookEventsScraperOutputItem = z.object({
    inputUrl: z.string().describe("Original input URL used to find the event")
        .optional(),
    url: z.string().describe("Facebook event URL").optional(),
    id: z.string().describe("Facebook event ID").optional(),
    name: z.string().describe("Event name or title").optional(),
    eventFrequency: z.string().describe("Recurrence frequency of the event")
        .optional(),
    dateTimeSentence: z.string().describe(
        "Human-readable date and time description",
    ).optional(),
    utcStartDate: z.string().describe("Event start time in UTC (ISO 8601)")
        .optional(),
    utcEndDate: z.string().describe("Event end time in UTC (ISO 8601)")
        .optional(),
    startTime: z.string().describe("Local start time").optional(),
    imageUrl: z.string().describe("Event cover image URL").optional(),
    imageCaption: z.string().describe("Caption for the event cover image")
        .optional(),
    isCanceled: z.boolean().describe("Whether the event has been canceled")
        .optional(),
    address: z.string().describe("Event address").optional(),
    coverVideo: z.record(z.string(), z.any()).describe("Cover video object")
        .optional(),
    hasChildEvents: z.boolean().describe(
        "Whether this is a recurring event with child events",
    ).optional(),
    childEvents: z.array(z.any()).describe(
        "Child event objects for recurring events",
    ).optional(),
    duration: z.string().describe("Human-readable event duration").optional(),
    description: z.string().describe("Event description").optional(),
    usersResponded: z.number().describe("Total number of user responses")
        .optional(),
    usersInterested: z.number().describe("Number of users marked as interested")
        .optional(),
    usersGoing: z.number().describe("Number of users marked as going")
        .optional(),
    location: z.object({
        url: z.string().describe("Location page URL").optional(),
        id: z.string().describe("Location Facebook ID").optional(),
        name: z.string().describe("Location name").optional(),
        contextualName: z.string().describe("Contextual name including city")
            .optional(),
        placeType: z.string().describe("Type of place").optional(),
        latitude: z.number().describe("Latitude coordinate").optional(),
        longitude: z.number().describe("Longitude coordinate").optional(),
        countryCode: z.string().describe("ISO country code").optional(),
        streetAddress: z.string().describe("Street address").optional(),
        city: z.string().describe("City name").optional(),
    }).describe("Event location details").optional(),
    ticketsInfo: z.object({
        buyUrl: z.string().describe("URL to purchase tickets").optional(),
        price: z.string().describe("Ticket price").optional(),
        title: z.string().describe("Ticket section title").optional(),
        subtitle: z.string().describe("Ticket section subtitle").optional(),
        ticketProvider: z.string().describe("Name of the ticketing provider")
            .optional(),
    }).describe("Ticket purchase information").optional(),
    organizators: z.array(z.any()).describe("List of event organizers")
        .optional(),
    organizedBy: z.string().describe("Organizer display text").optional(),
    eventType: z.string().describe("Event type classification").optional(),
    privacyInfo: z.string().describe("Privacy setting of the event").optional(),
    isPast: z.boolean().describe("Whether the event has already passed")
        .optional(),
    isOnline: z.boolean().describe("Whether the event is online").optional(),
    paidContent: z.boolean().describe("Whether the event has paid content")
        .optional(),
    isClassEvent: z.boolean().describe("Whether the event is a class")
        .optional(),
    isLiveAudioRoom: z.boolean().describe(
        "Whether the event is a live audio room",
    ).optional(),
    isRemoteLearningClass: z.boolean().describe(
        "Whether the event is a remote learning class",
    ).optional(),
    isRemoteLearningCourse: z.boolean().describe(
        "Whether the event is a remote learning course",
    ).optional(),
    groupEventPinnedToFeatured: z.boolean().describe(
        "Whether the group event is pinned to featured",
    ).optional(),
    hasRecordingAvailable: z.boolean().describe(
        "Whether a recording is available",
    ).optional(),
    discoveryCategories: z.array(z.any()).describe(
        "Discovery category tags for the event",
    ).optional(),
    externalLinks: z.array(z.any()).describe(
        "External URLs related to the event",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zFacebookEventsScraperOutput = z.array(
    zFacebookEventsScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
