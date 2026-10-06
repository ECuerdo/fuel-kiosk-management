export type AlertStatus = "New" | "Under Investigation" | "Resolved" | "False Alarm";

export interface AssetAndEquipment {
    id: number;
    item_image: string | null;
    item_id: number | null;
    quantity: number | null;
    rfid_code: string | null;
    barcode: string | null;
    serial: string | null;
    department: number | null;
    employee: number | null;
    cost_per_item: number | null;
    total: number | null;
    condition: "Good" | "Bad" | "Under Maintenance" | "Discontinued" | null;
    life_span: number | null;
    is_active: number; // 0 or 1
    is_active_warning: number; // 0 or 1
    encoder: number | null;
    date_acquired: string | null;
    date_created: string | null;
    item: number | null;
}

export interface AssetPerimeterAlert {
    alert_id: number;
    asset_id: number;
    accountable_user_id: number | null;
    scanner_gate_id: string | null;
    scanner_location_name: string | null;
    scanned_at: string;
    alert_status: AlertStatus;
    resolved_by: number | null;
    resolution_remarks: string | null;
    resolved_at: string | null;
}

export interface AssetPerimeterAlertWithDetails extends AssetPerimeterAlert {
    asset_details?: {
        item_name?: string;
        type_name?: string;
        classification_name?: string;
        serial?: string;
        barcode?: string;
        employee_name?: string;
        encoder_name?: string;
    };
    accountable_user_name?: string | null;
    resolved_by_name?: string;
}

export interface RFIDScanRequest {
    rfidCode: string;
    scannerGateId?: string;
    scannerLocationName?: string;
}

export interface RFIDScanResponse {
    success: boolean;
    message: string;
    alert?: AssetPerimeterAlert;
    noAlert?: boolean;
    error?: string;
}

export interface AlertListResponse {
    success: boolean;
    alerts: AssetPerimeterAlertWithDetails[];
    total: number;
    error?: string;
}