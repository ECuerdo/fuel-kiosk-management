import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Delete the module-specific auth token
        cookieStore.delete("inbound_outbound_token");

        return NextResponse.json({ success: true, message: "Logged out from module successfully." });
    } catch (err) {
        console.error("[Logout API] Error deleting cookie:", err);
        return NextResponse.json(
            { success: false, message: "Failed to log out." },
            { status: 500 }
        );
    }
}
