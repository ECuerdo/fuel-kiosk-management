export interface UserFuelBalance {
    userId: number;
    rfid: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    position: string;
    allocationId: number;
    dispatchId: number;
    docNo: string;
    allocatedAt: string;
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

export interface DispenseRequest {
    userId: number;
    docNo: string;
    liter: number;
    rfid?: string;
    createdBy?: number;
}

export type DispenserStep = "RFID_INPUT" | "DISPENSE_NUMPAD" | "SUCCESS";
