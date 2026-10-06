import { NextRequest, NextResponse } from "next/server";

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

        console.log("[RFID] Fetching:", requestUrl);

        const userRes = await fetch(requestUrl, { headers });

        const rawText = await userRes.text();
        console.log("[RFID] Directus status:", userRes.status, "| body:", rawText);

        if (!userRes.ok) {
            return NextResponse.json(
                {
                    authorized: false,
                    message: "Failed to reach user directory.",
                    debug: { directusStatus: userRes.status, directusBody: rawText },
                },
                { status: 502 }
            );
        }

        const userData = JSON.parse(rawText) as { data: Array<{ user_id: number; user_department: number | string }> };
        const user = userData.data?.[0];

        if (!user) {
            return NextResponse.json(
                { authorized: false, message: "RFID card not recognized." },
                { status: 200 }
            );
        }

        // Authorize only if user belongs to department ID 2 or 13
        const isAuthorized = AUTHORIZED_DEPARTMENT_IDS.includes(Number(user.user_department));

        console.log("[RFID] user_department:", user.user_department, "| authorized:", isAuthorized);

        // If authorized, set a cookie for route protection
        const response = NextResponse.json({ authorized: isAuthorized }, { status: 200 });

        if (isAuthorized) {
            const isProduction = process.env.NODE_ENV === "production";
            response.cookies.set("inbound_outbound_token", "true", {
                httpOnly: true,
                secure: isProduction ? (request.nextUrl.protocol === "https:") : false,
                sameSite: "lax",
                maxAge: 60 * 30, // 30 minutes
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
