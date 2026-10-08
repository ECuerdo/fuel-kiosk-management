import { NextRequest, NextResponse } from "next/server";
import { AttemptLimiter, formatCountdown } from "@/lib/attempt-limiter";

const MINUTE = 60_000;

// Attendant login and the inbound / outbound unlock: 5 failed taps in 5 minutes pause that kiosk for
// 5 minutes, doubling on each repeat up to 15 minutes. The doubling starts over after 24 hours without a pause.
export const loginLimiter = new AttemptLimiter({
    maximumFailures: 5, windowMs: 5 * MINUTE, firstPauseMs: 5 * MINUTE, longestPauseMs: 15 * MINUTE,
    calmDownMs: 24 * 60 * MINUTE,
});

// Dispenser card taps: 5 unknown cards in 5 minutes pause that kiosk's dispenser for 1 minute.
// Kept short because a longer pause would hold up everyone waiting at the pump.
export const dispenserLimiter = new AttemptLimiter({
    maximumFailures: 5, windowMs: 5 * MINUTE, firstPauseMs: MINUTE, longestPauseMs: MINUTE,
    calmDownMs: 24 * 60 * MINUTE,
});

// Which kiosk a request comes from: its network address as the server reports it.
// Note: with no proxy in front of the kiosk application this value is taken from a request header.
export function kioskKey(req: NextRequest, area: string): string {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return area + ":" + (forwarded || req.headers.get("x-real-ip") || "unknown");
}

// The answer given while a kiosk is paused. retryAfterSeconds lets the screen show a countdown.
export function tooManyAttempts(seconds: number) {
    return NextResponse.json(
        {
            success: false,
            authorized: false,
            code: "TOO_MANY_ATTEMPTS",
            message: `Too many attempts. Try again in ${formatCountdown(seconds)}.`,
            retryAfterSeconds: seconds,
        },
        { status: 429, headers: { "Retry-After": String(seconds) } },
    );
}
