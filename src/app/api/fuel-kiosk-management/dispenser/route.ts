import { NextRequest, NextResponse } from "next/server";
import { fuelApiPost } from "@/lib/fuel-api";
import { readSession } from "@/lib/kiosk-session";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const AUTH_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

// POST /api/fuel-kiosk-management/dispenser
// Body: {"cardNumber": "0012345678", "liters": 5.00, "requestId": "one value per dispense"}
// Records fuel drawn through the fuel service, which checks the balance and issues the receipt number.
// The attendant is taken from the kiosk session, not from the browser.
// Whatever the service answers is passed on. If it gives no answer, the kiosk is told it is unavailable;
// nothing is saved any other way and no success is reported.
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null) as
        { cardNumber?: unknown; liters?: unknown; requestId?: unknown } | null;
    const cardNumber = typeof body?.cardNumber === "string" ? body.cardNumber.trim() : "";
    const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
    const liters = Number(body?.liters);

    if (!cardNumber || !requestId || !Number.isFinite(liters) || liters <= 0) {
        return NextResponse.json(
            { code: "INVALID_REQUEST", message: "cardNumber, requestId and liters above zero are required" },
            { status: 400 },
        );
    }

    const session = await readSession("kiosk", req.cookies.get("kiosk_token")?.value,
        process.env.KIOSK_SESSION_SECRET);
    const attendantCardNumber = session?.rfid;

    const result = await fuelApiPost(
        { baseUrl: process.env.SPRING_API_BASE_URL, apiKey: process.env.FUEL_API_KEY },
        "/api/fuel/dispenses",
        { cardNumber, liters, requestId, attendantCardNumber },
    );
    return NextResponse.json(result.body, { status: result.status });
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
