import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Delete the global kiosk token
        cookieStore.delete("kiosk_token");

        return NextResponse.json({ success: true, message: "Logged out from system successfully." });
    } catch (err) {
        console.error("[Global Logout API] Error deleting cookie:", err);
        return NextResponse.json(
            { success: false, message: "Failed to log out." },
            { status: 500 }
        );
    }
}
