import { UserFuelBalance, DispenseRequest, DispenseResult } from "../types";

// The message given for a refusal, or a fallback when there is none.
async function messageFrom(res: Response, fallback: string): Promise<string> {
    const data = await res.json().catch(() => ({})) as { message?: string };
    return data.message || fallback;
}

export const fetchProvider = {
    async getUserFuelBalance(rfid: string): Promise<UserFuelBalance> {
        const res = await fetch(`/api/fuel-kiosk-management/balance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cardNumber: rfid }),
            cache: "no-store",
        });

        if (!res.ok) {
            throw new Error(await messageFrom(res, "RFID Card not found or invalid balance."));
        }

        const balance = await res.json() as Omit<UserFuelBalance, "rfid">;
        return { ...balance, rfid };
    },

    async dispenseFuel(payload: DispenseRequest): Promise<DispenseResult> {
        const res = await fetch(`/api/fuel-kiosk-management/dispenser`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            throw new Error(await messageFrom(res, "Fuel service unavailable. Do not dispense."));
        }

        return await res.json() as DispenseResult;
    }
};
