import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const AUTH_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rfid = searchParams.get("rfid");
        const userId = searchParams.get("userId");

        if (!rfid && !userId) {
            return NextResponse.json(
                { error: "Either rfid or userId query parameter is required" },
                { status: 400 }
            );
        }

        // 1. First try calling Spring API if configured
        if (SPRING_API_BASE_URL) {
            try {
                const targetUrl = new URL(`${SPRING_API_BASE_URL}/api/user-fuel-balance`);
                if (rfid) targetUrl.searchParams.set("rfid", rfid);
                if (userId) targetUrl.searchParams.set("userId", userId);

                const response = await fetch(targetUrl.toString(), {
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                });

                if (response.ok) {
                    const data = await response.json();
                    return NextResponse.json(data);
                }
            } catch (err) {
                console.warn("[user-fuel-balance] Spring API attempt failed, falling back to Directus/Database lookup:", err);
            }
        }

        // 2. Fallback to Directus lookup
        let filterObj: Record<string, unknown> = {};
        if (rfid) {
            filterObj = { rf_id: { _eq: rfid } };
        } else if (userId) {
            filterObj = { user_id: { _eq: Number(userId) } };
        }

        const query = new URLSearchParams({
            filter: JSON.stringify(filterObj),
            fields: "user_id,user_fname,user_mname,user_lname,rf_id,user_position",
            limit: "1",
        });

        const userRes = await fetch(`${DIRECTUS_URL}/items/user?${query.toString()}`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            cache: "no-store",
        });

        if (!userRes.ok) {
            console.error("Directus user balance lookup failed:", await userRes.text());
            return NextResponse.json({ error: "Failed to query user database" }, { status: 500 });
        }

        const userData = await userRes.json();
        if (!userData.data || userData.data.length === 0) {
            return NextResponse.json({ error: "User RFID not found" }, { status: 404 });
        }

        const user = userData.data[0];

        // Fetch user_fuel_usage for remaining balance calculation if available
        let usedLiters = 0;
        try {
            const usageQuery = new URLSearchParams({
                filter: JSON.stringify({ user_id: { _eq: user.user_id } }),
                fields: "liter",
                limit: "-1",
            });
            const usageRes = await fetch(`${DIRECTUS_URL}/items/user_fuel_usage?${usageQuery.toString()}`, {
                headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
                cache: "no-store",
            });
            if (usageRes.ok) {
                const usageData = await usageRes.json();
                if (usageData.data && Array.isArray(usageData.data)) {
                    usedLiters = usageData.data.reduce((sum: number, item: { liter?: number }) => sum + (Number(item.liter) || 0), 0);
                }
            }
        } catch {
            // ignore usage lookup error
        }

        const allocatedLiters = 50.00; // Default allocation limit fallback
        const remainingLiters = Math.max(0, allocatedLiters - usedLiters);

        const responsePayload = {
            userId: user.user_id,
            rfid: user.rf_id || rfid || "",
            firstName: user.user_fname || "Driver",
            middleName: user.user_mname || null,
            lastName: user.user_lname || "",
            position: user.user_position || "Driver",
            allocationId: 1,
            dispatchId: 1000 + user.user_id,
            docNo: `DP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${user.user_id}`,
            allocatedAt: new Date().toISOString().slice(0, 19),
            allocatedLiters: Number(allocatedLiters.toFixed(2)),
            usedLiters: Number(usedLiters.toFixed(2)),
            remainingLiters: Number(remainingLiters.toFixed(2)),
        };

        return NextResponse.json(responsePayload);
    } catch (error: unknown) {
        console.error("Error in user-fuel-balance API:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
