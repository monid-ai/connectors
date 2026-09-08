import { z } from "zod";

/**
 * scraptik/tiktok-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/scraptik~tiktok-api/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zTiktokApiBody = z.object({
    "profile_username": z.string().describe(
        "Enter one TikTok username (without the @ symbol). Example: 'katyperry'",
    ).optional(),
    "profile_userId": z.string().describe(
        "User ID used for identifying a TikTok account. Example: 131256363632148480",
    ).optional(),
    "profile_secUserId": z.string().describe(
        "Secondary user ID used by TikTok for user identification. Example: MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM",
    ).optional(),
    "profile_region": z.string().describe(
        "Optional 2-letter code for region (which might affect the data that appears). Defaults to 'GB'",
    ).optional(),
    "usernameToId_username": z.string().describe(
        "Get the user ID from the username. You'll use this ID for most requests. Example: 'katyperry'",
    ).optional(),
    "followers_userId": z.string().describe(
        "User ID to fetch followers for. Example: 131256363632148480",
    ).optional(),
    "followers_secUserId": z.string().describe(
        "Secondary user ID used by TikTok for user identification. Example: MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM",
    ).optional(),
    "followers_count": z.number().int().describe(
        "Number of followers to retrieve. Default is 10.",
    ).optional(),
    "followers_maxTime": z.number().int().describe(
        "Pagination cursor. Use the 'min_time' value from the previous response to fetch more results.",
    ).optional(),
    "following_userId": z.string().describe(
        "User ID to fetch followings for. Example: 131256363632148480",
    ).optional(),
    "following_secUserId": z.string().describe(
        "Optional secondary user ID. Example: MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM",
    ).optional(),
    "following_count": z.number().int().describe(
        "Number of followings to retrieve. Default is 10.",
    ).optional(),
    "following_maxTime": z.number().int().describe(
        "Pagination cursor. Use the 'min_time' value from the previous response to fetch more results.",
    ).optional(),
    "post_awemeId": z.string().describe(
        "The ID of the TikTok video post to retrieve. Example: 6811123699203329285",
    ).optional(),
    "post_region": z.string().describe(
        "Optional 2-letter code for region (which might affect the data that appears). Defaults to 'GB'",
    ).optional(),
    "userPosts_userId": z.string().describe(
        "User ID whose posts should be retrieved. Example: 6546356850533602319",
    ).optional(),
    "userPosts_secUserId": z.string().describe(
        "Optional secondary user ID. Example: MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM",
    ).optional(),
    "userPosts_count": z.number().int().describe(
        "Number of posts to retrieve. Default is 10.",
    ).optional(),
    "userPosts_region": z.string().describe(
        "Optional 2-letter code for region (which might affect the data that appears). Defaults to 'GB'",
    ).optional(),
    "userPosts_maxCursor": z.string().describe(
        "Pagination cursor for fetching next set of posts.",
    ).optional(),
    "music_id": z.string().describe(
        "The ID of the TikTok music track to retrieve. Example: 6873491642666469377",
    ).optional(),
    "musicPosts_musicId": z.string().describe(
        "ID of the music to fetch associated video posts. Example: 7047667719411370758",
    ).optional(),
    "musicPosts_count": z.number().int().describe(
        "Number of posts to retrieve. Default is 18.",
    ).optional(),
    "musicPosts_cursor": z.number().int().describe(
        "Pagination cursor for loading additional results.",
    ).optional(),
    "challengePosts_cid": z.string().describe(
        "Hashtag/Challenge ID used to fetch associated posts. Example: 1592380847102982",
    ).optional(),
    "challengePosts_count": z.number().int().describe(
        "Number of challenge posts to fetch. Default is 20.",
    ).optional(),
    "challengePosts_cursor": z.number().int().describe(
        "Pagination cursor to retrieve more results for a challenge.",
    ).optional(),
    "commentReplies_commentId": z.string().describe(
        "ID of the parent comment to fetch replies for. Example: 6999860547420766982",
    ).optional(),
    "commentReplies_awemeId": z.string().describe(
        "ID of the TikTok post containing the comment. Example: 6996617408010112262",
    ).optional(),
    "commentReplies_count": z.number().int().describe(
        "Number of replies to fetch. Default is 10.",
    ).optional(),
    "commentReplies_cursor": z.number().int().describe(
        "Pagination cursor to retrieve more comment replies.",
    ).optional(),
    "listComments_awemeId": z.string().describe(
        "ID of the TikTok post to fetch top-level comments for. Example: 6944028931875949829",
    ).optional(),
    "listComments_count": z.number().int().describe(
        "Number of top-level comments to fetch. Default is 10.",
    ).optional(),
    "listComments_cursor": z.number().int().describe(
        "Pagination cursor to retrieve more top-level comments.",
    ).optional(),
    "userLikes_userId": z.string().describe(
        "User ID whose liked posts should be retrieved. Example: 6546356850533602319",
    ).optional(),
    "userLikes_count": z.number().int().describe(
        "Number of liked posts to retrieve. Default is 10.",
    ).optional(),
    "userLikes_maxCursor": z.string().describe(
        "Pagination cursor for fetching additional liked posts.",
    ).optional(),
    "searchUsers_keyword": z.string().describe(
        "Search for users by keyword. Example: 'japan'",
    ).optional(),
    "searchUsers_count": z.number().int().describe(
        "Number of users to retrieve. Default is 20.",
    ).optional(),
    "searchUsers_cursor": z.number().int().describe(
        "Pagination cursor to retrieve more users.",
    ).optional(),
    "searchPosts_keyword": z.string().describe(
        "Search for posts by keyword. Example: 'nike'",
    ).optional(),
    "searchPosts_count": z.number().int().describe(
        "Number of posts to retrieve. Default is 10.",
    ).optional(),
    "searchPosts_offset": z.number().int().describe(
        "Offset for pagination. Default is 0.",
    ).optional(),
    "searchPosts_region": z.string().describe(
        "Optional 2-letter code for region (which might affect the data that appears). Defaults to 'GB'",
    ).optional(),
    "searchPosts_publishTime": z.number().int().describe(
        "Publish time for filtering posts. Default is 0. 0 = All Time, 1 = Yesterday, 7 = This Week, 30 = This Month, 90 = Last 3 Months, 180 = Last 6 Months",
    ).optional(),
    "searchPosts_sortType": z.number().int().describe(
        "Sort type for filtering posts. Default is 0. 0 = Relevance, 1 = Most Liked, 3 = Date",
    ).optional(),
    "searchSounds_keyword": z.string().describe(
        "Search for sounds by keyword. Example: 'japan'",
    ).optional(),
    "searchSounds_count": z.number().int().describe(
        "Number of sounds to retrieve. Default is 10.",
    ).optional(),
    "searchSounds_cursor": z.number().int().describe(
        "Pagination cursor to retrieve more sounds.",
    ).optional(),
    "searchSounds_region": z.string().describe(
        "Optional 2-letter code for region (which might affect the data that appears). Defaults to 'GB'",
    ).optional(),
    "searchSounds_useFilters": z.boolean().describe(
        "Whether to use filters. Default is false. 0 is no, 1 is yes.",
    ).optional(),
    "searchSounds_filterBy": z.number().int().describe(
        "Filter by. Default is 0. 0 = All, 1 = Title, 2 = Creators",
    ).optional(),
    "searchSounds_sortType": z.number().int().describe(
        "Sort type for filtering sounds. Default is 0. 0 = Relevance, 1 = Most used, 2 = Most recent, 3 = Shortest, 4 = Longest",
    ).optional(),
    "searchHashtags_keyword": z.string().describe(
        "Search for hashtags by keyword. Example: 'japan'",
    ).optional(),
    "searchHashtags_count": z.number().int().describe(
        "Number of hashtags to retrieve. Default is 20.",
    ).optional(),
    "searchHashtags_region": z.string().describe(
        "Optional 2-letter code for region (which might affect the data that appears). Defaults to 'GB'",
    ).optional(),
    "searchHashtags_cursor": z.number().int().describe(
        "Pagination cursor to retrieve more hashtags.",
    ).optional(),
    "searchLives_keyword": z.string().describe(
        "Search for lives by keyword. Example: 'tiktok'",
    ).optional(),
    "searchLives_count": z.number().int().describe(
        "Number of lives to retrieve. Default is 20.",
    ).optional(),
    "searchLives_offset": z.number().int().describe(
        "Offset for pagination. Default is 0.",
    ).optional(),
    "videoWithoutWatermark_awemeId": z.string().describe(
        "Get the video without watermark. Example: 6811123699203329285",
    ).optional(),
});
