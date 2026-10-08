import { NextRequest, NextResponse } from "next/server";
import { createSession, INBOUND_SESSION_MS } from "@/lib/kiosk-session";
import { kioskKey, loginLimiter, tooManyAttempts } from "@/lib/kiosk-limits";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

// Department IDs authorized to access Inbound / Outbound
const AUTHORIZED_DEPARTMENT_IDS = [2, 13];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { rfidCode?: string };
        const rfidCode = body.rfidCode?.trim();

        if (!rfidCode) {
            return NextResponse.json(
                { authorized: false, message: "RFID code is required." },
                { status: 400 }
            );
        }

        const kiosk = kioskKey(request, "inbound");
        const wait = loginLimiter.secondsUntilAllowed(kiosk);
        if (wait > 0) {
            return tooManyAttempts(wait);
        }

        if (!API_BASE) {
            console.error("[RFID] Missing NEXT_PUBLIC_API_BASE_URL");
            return NextResponse.json(
                { authorized: false, message: "Server configuration error." },
                { status: 500 }
            );
        }

        // Build URL — use URLSearchParams so brackets get encoded as %5B%5D
        // which Directus accepts without needing a Bearer token on public collections
        const qs = new URLSearchParams({
            "filter[rf_id][_eq]": rfidCode,
            "fields": "user_id,user_department",
            "limit": "1",
        });

        const requestUrl = `${API_BASE}/items/user?${qs.toString()}`;

        // Only include auth header when the token is present
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (TOKEN) {
            headers["Authorization"] = `Bearer ${TOKEN}`;
        }

        const userRes = await fetch(requestUrl, { headers });

        const rawText = await userRes.text();
        if (!userRes.ok) {
            console.error("[RFID] User directory answered", userRes.status);
            return NextResponse.json(
                { authorized: false, message: "Failed to reach user directory." },
                { status: 502 }
            );
        }

        const userData = JSON.parse(rawText) as { data: Array<{ user_id: number; user_department: number | string }> };
        const user = userData.data?.[0];

        if (!user) {
            const pause = loginLimiter.recordFailure(kiosk);
            if (pause > 0) {
                return tooManyAttempts(pause);
            }
            return NextResponse.json(
                { authorized: false, message: "RFID card not recognized." },
                { status: 200 }
            );
        }

        // Authorize only if user belongs to department ID 2 or 13
        const isAuthorized = AUTHORIZED_DEPARTMENT_IDS.includes(Number(user.user_department));

        if (!isAuthorized) {
            const pause = loginLimiter.recordFailure(kiosk);
            if (pause > 0) {
                return tooManyAttempts(pause);
            }
        }

        // If authorized, set a cookie for route protection
        const response = NextResponse.json({ authorized: isAuthorized }, { status: 200 });

        if (isAuthorized) {
            const isProduction = process.env.NODE_ENV === "production";
            const token = await createSession("inbound",
                { userId: user.user_id, dept: user.user_department, rfid: rfidCode },
                INBOUND_SESSION_MS, process.env.KIOSK_SESSION_SECRET);
            response.cookies.set("inbound_outbound_token", token, {
                httpOnly: true,
                secure: isProduction ? (request.nextUrl.protocol === "https:") : false,
                sameSite: "lax",
                maxAge: INBOUND_SESSION_MS / 1000, // 30 minutes
                path: "/",
            });
        }

        return response;
    } catch (err) {
        console.error("[RFID] Unexpected error:", err);
        return NextResponse.json(
            { authorized: false, message: "Internal server error." },
            { status: 500 }
        );
    }
}
