import { UserFuelBalance, DispenseRequest } from "../types";

export const fetchProvider = {
    async getUserFuelBalance(rfid: string): Promise<UserFuelBalance> {
        const res = await fetch(`/api/user-fuel-balance?rfid=${encodeURIComponent(rfid)}`, {
            cache: "no-store",
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "RFID Card not found or invalid balance.");
        }

        return await res.json();
    },

    async getUserFuelBalanceById(userId: number): Promise<UserFuelBalance> {
        const res = await fetch(`/api/user-fuel-balance?userId=${userId}`, {
            cache: "no-store",
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to fetch user balance.");
        }

        return await res.json();
    },

    async dispenseFuel(payload: DispenseRequest): Promise<{ success: boolean; message?: string; record?: { doc_no?: string }; docNo?: string }> {
        const res = await fetch(`/api/fuel-kiosk-management/dispenser`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to record fuel dispensing.");
        }

        return await res.json();
    }
};
