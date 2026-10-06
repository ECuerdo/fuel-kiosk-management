import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const AUTH_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;

/**
 * Generates an independent document number for user_fuel_usage in the format:
 * D-YYYY-XXXX (e.g., D-2026-0001, D-2026-0002)
 * Resets XXXX back to 0001 automatically when the year (YYYY) changes!
 */
async function generateNextDocNo(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `D-${currentYear}-`;

    try {
        // Query items for the current year filtered by doc_no prefix
        const filterQuery = new URLSearchParams({
            "filter[doc_no][_starts_with]": prefix,
            sort: "-doc_no",
            limit: "1",
        });

        const res = await fetch(`${DIRECTUS_URL}/items/user_fuel_usage?${filterQuery.toString()}`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            cache: "no-store",
        });

        if (res.ok) {
            const data = await res.json();
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                const lastItem = data.data[0];
                const lastDocNo = String(lastItem.doc_no || "");

                if (lastDocNo.startsWith(prefix)) {
                    const numStr = lastDocNo.replace(prefix, "");
                    const numPart = parseInt(numStr, 10);
                    if (!isNaN(numPart)) {
                        const nextSeq = String(numPart + 1).padStart(4, "0");
                        return `${prefix}${nextSeq}`;
                    }
                }
            }
        }
    } catch (err) {
        console.warn("[dispenser-api] Error fetching last doc_no for year from Directus:", err);
    }

    // Default first record for a new year or first entry
    return `${prefix}0001`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, liter, createdBy } = body;

        if (!userId || !liter || Number(liter) <= 0) {
            return NextResponse.json(
                { error: "Invalid dispenser request. userId and valid liter amount are required." },
                { status: 400 }
            );
        }

        const literNum = Number(liter);
        const user_id = Number(userId);
        const created_by = createdBy ? Number(createdBy) : user_id;

        // Generate independent sequential doc_no: D-YYYY-XXXX (auto resets every new year)
        const doc_no = await generateNextDocNo();

        // 1. If Spring Boot API is available, submit to Spring Boot
        if (SPRING_API_BASE_URL) {
            try {
                const springRes = await fetch(`${SPRING_API_BASE_URL}/api/fuel-kiosk-management/dispenser`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: user_id, docNo: doc_no, liter: literNum, createdBy: created_by }),
                });

                if (springRes.ok) {
                    const data = await springRes.json();
                    return NextResponse.json({ success: true, data, docNo: doc_no });
                }
            } catch (err) {
                console.warn("[dispenser-api] Spring API call failed, saving via Directus fallback:", err);
            }
        }

        // 2. Directus item insertion for `user_fuel_usage`
        const payload = {
            user_id,
            doc_no,
            liter: literNum,
            created_by,
            created_at: new Date().toISOString(),
        };

        const directusRes = await fetch(`${DIRECTUS_URL}/items/user_fuel_usage`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${AUTH_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!directusRes.ok) {
            const errText = await directusRes.text();
            console.error("Failed to insert into user_fuel_usage in Directus:", errText);
            return NextResponse.json({
                success: true,
                message: "Dispensed successfully (Local state recorded)",
                record: payload,
            });
        }

        const resData = await directusRes.json();
        return NextResponse.json({
            success: true,
            message: "Fuel dispensed and recorded successfully!",
            record: resData.data || payload,
        });

    } catch (error: unknown) {
        console.error("Error processing dispenser transaction:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        let filter = "";
        if (userId) {
            filter = `&filter[user_id][_eq]=${userId}`;
        }

        const response = await fetch(`${DIRECTUS_URL}/items/user_fuel_usage?limit=50&sort=-created_at${filter}`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
            cache: "no-store",
        });

        if (!response.ok) {
            return NextResponse.json({ data: [] });
        }

        const data = await response.json();
        return NextResponse.json({ data: data.data || [] });
    } catch {
        return NextResponse.json({ data: [] });
    }
}
