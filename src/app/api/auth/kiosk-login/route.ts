import { NextRequest, NextResponse } from "next/server";
import { createSession, KIOSK_SESSION_MS } from "@/lib/kiosk-session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

// Department IDs authorized to access the entire Kiosk Management system
const AUTHORIZED_DEPARTMENT_IDS = [2, 13];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { rfidCode?: string };
        const rfidCode = body.rfidCode?.trim();

        if (!rfidCode) {
            return NextResponse.json(
                { success: false, message: "RFID code is required." },
                { status: 400 }
            );
        }

        if (!API_BASE) {
            console.error("[Auth] Missing NEXT_PUBLIC_API_BASE_URL");
            return NextResponse.json(
                { success: false, message: "Server configuration error." },
                { status: 500 }
            );
        }

        // Build URL for public user collection query
        const qs = new URLSearchParams({
            "filter[rf_id][_eq]": rfidCode,
            "fields": "user_id,user_department,user_fname,user_lname",
            "limit": "1",
        });

        const requestUrl = `${API_BASE}/items/user?${qs.toString()}`;

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (TOKEN) {
            headers["Authorization"] = `Bearer ${TOKEN}`;
        } else {
            console.warn("[Auth] DIRECTUS_STATIC_TOKEN is missing. This may lead to empty results if the collection is not public.");
        }

        // Force 'no-store' so we always get fresh data from Directus instead of Next.js cache
        const userRes = await fetch(requestUrl, {
            headers,
            cache: "no-store",
            next: { revalidate: 0 } // Extra safety for Next.js App Router caching
        });
        const rawText = await userRes.text();

        if (!userRes.ok) {
            console.error("[Auth] Directus validation failed:", userRes.status, rawText);
            return NextResponse.json(
                {
                    success: false,
                    message: "Database authentication failed.",
                },
                { status: 502 }
            );
        }

        const userData = JSON.parse(rawText) as { data: Array<{ user_id: number; user_department: number | string; user_fname: string; user_lname: string }> };
        const user = userData.data?.[0];

        if (!user) {
            return NextResponse.json(
                { success: false, message: "RFID card not recognized." },
                { status: 401 }
            );
        }

        // Authorize if user belongs to department ID 2 or 13
        const isAuthorized = AUTHORIZED_DEPARTMENT_IDS.includes(Number(user.user_department));

        if (!isAuthorized) {
            console.warn(`[Auth] Authorized check failed for user ${user.user_id} in department ${user.user_department}`);
            return NextResponse.json(
                { success: false, message: "Your department is not authorized for Kiosk access." },
                { status: 403 }
            );
        }

        // Detect if we are on HTTP or HTTPS to handle the 'secure' flag correctly
        const isProduction = process.env.NODE_ENV === "production";

        // The session is signed with the server's secret, so it cannot be made up or changed in the browser.
        // It keeps the card number so a dispense can be recorded under the attendant who was logged in.
        let tokenPayload: string;
        try {
            tokenPayload = await createSession("kiosk",
                { userId: user.user_id, dept: user.user_department, rfid: rfidCode },
                KIOSK_SESSION_MS, process.env.KIOSK_SESSION_SECRET);
        } catch (err) {
            console.error("[Auth] Could not create a session:", err);
            return NextResponse.json({ success: false, message: "Server configuration error." }, { status: 500 });
        }

        const response = NextResponse.json({
            success: true,
            user: {
                firstName: user.user_fname,
                lastName: user.user_lname,
            }
        }, { status: 200 });

        response.cookies.set("kiosk_token", tokenPayload, {
            httpOnly: true,
            secure: isProduction ? (request.nextUrl.protocol === "https:") : false,
            sameSite: "lax",
            maxAge: KIOSK_SESSION_MS / 1000, // 12 hours
            path: "/",
        });

        console.log(`[Auth] User ${user.user_id} (${user.user_fname}) logged in successfully.`);

        return response;

    } catch (err) {
        console.error("[Auth] Unexpected login error:", err);
        return NextResponse.json(
            { success: false, message: "Internal server error." },
            { status: 500 }
        );
    }
}
