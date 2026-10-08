import { NextRequest, NextResponse } from "next/server";
import { fuelApiPost } from "@/lib/fuel-api";
import { dispenserLimiter, kioskKey, tooManyAttempts } from "@/lib/kiosk-limits";

// POST /api/fuel-kiosk-management/balance
// Body: {"cardNumber": "0012345678"}
// The fuel balance of the user holding the tapped card, from the fuel service.
// The card number travels in the body so it is not written into address logs.
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null) as { cardNumber?: unknown } | null;
    const cardNumber = typeof body?.cardNumber === "string" ? body.cardNumber.trim() : "";
    if (!cardNumber) {
        return NextResponse.json({ code: "INVALID_REQUEST", message: "cardNumber is required" }, { status: 400 });
    }

    // After too many unknown cards the dispenser's card entry is paused for a short while.
    const kiosk = kioskKey(req, "dispenser");
    const wait = dispenserLimiter.secondsUntilAllowed(kiosk);
    if (wait > 0) {
        return tooManyAttempts(wait);
    }

    const result = await fuelApiPost(
        { baseUrl: process.env.SPRING_API_BASE_URL, apiKey: process.env.FUEL_API_KEY },
        "/api/fuel/balance",
        { cardNumber },
    );
    if (result.status === 404) {
        const pause = dispenserLimiter.recordFailure(kiosk);
        if (pause > 0) {
            return tooManyAttempts(pause);
        }
    }
    return NextResponse.json(result.body, { status: result.status });
}
