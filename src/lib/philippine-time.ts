// The time the kiosk writes for a dispatch or an arrival.
//
// The database keeps Philippine clock time, and Directus passes a clock time through unchanged, written in the
// "...Z" form (a plan stored as 16:20 is read back as "16:20:00.000Z"). A browser's toISOString() is real UTC,
// eight hours behind, so sending it as it is stores every dispatch and arrival eight hours early.
// This turns a moment into the Philippine clock time, in the form Directus stores unchanged.

// Philippine time is UTC+8 all year; there is no daylight saving.
const PHILIPPINE_OFFSET_MS = 8 * 60 * 60 * 1000;

// "2026-10-08T16:20", "2026-10-08T16:20:11" or with a space instead of the T, and no zone at the end.
const CLOCK_TIME_WITHOUT_ZONE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

// value: a moment with a zone ("...Z" or "...+08:00"), or a Philippine clock time with no zone.
// Anything missing or unreadable means "now". The answer does not depend on the machine's own time zone.
export function toStoredPhilippineTime(value: unknown, now: () => number = Date.now): string {
    if (typeof value === "string") {
        const clockTime = CLOCK_TIME_WITHOUT_ZONE.exec(value.trim());
        if (clockTime) {
            return `${clockTime[1]}T${clockTime[2]}:${clockTime[3] ?? "00"}.000Z`;
        }
    }

    const parsed = typeof value === "string" && value.trim() ? Date.parse(value) : Number.NaN;
    const moment = Number.isNaN(parsed) ? now() : parsed;

    // Shift by eight hours, then read the result with the UTC getters that toISOString() uses.
    return new Date(moment + PHILIPPINE_OFFSET_MS).toISOString().slice(0, 19) + ".000Z";
}
