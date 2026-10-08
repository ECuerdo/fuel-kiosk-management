// The fuel balance of the user holding a card, as answered by the fuel service.
// rfid is the card that was tapped; the allocation details are empty when the user has no allocation.
export interface UserFuelBalance {
    userId: number;
    rfid: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    position: string;
    allocationId: number | null;
    allocationDocNo: string | null;
    allocatedAt: string | null;
    allocatedLiters: number;
    usedLiters: number;
    remainingLiters: number;
}

export interface FuelUsageRecord {
    id?: number;
    user_id: number;
    doc_no: string;
    liter: number;
    created_at?: string;
    created_by?: number;
}

// What the dispenser screen sends to record fuel drawn.
// requestId is made up once per dispense and sent again unchanged on a retry.
export interface DispenseRequest {
    cardNumber: string;
    liters: number;
    requestId: string;
}

// One recorded dispense, as answered by the fuel service.
// alreadyRecorded is true when this request had been recorded before and the first record is returned.
export interface DispenseResult {
    id: number;
    receiptNo: string;
    requestId: string;
    userId: number;
    liters: number;
    createdBy: number;
    createdAt: string;
    remainingLiters: number;
    alreadyRecorded: boolean;
}

export type DispenserStep = "RFID_INPUT" | "DISPENSE_NUMPAD" | "SUCCESS";
