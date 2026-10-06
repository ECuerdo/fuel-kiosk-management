import type { AssetPerimeterAlertWithDetails, RFIDScanResponse } from "../type";

/**
 * Fetch alerts from the API
 * @param statusFilter - Filter alerts by status ("all", "pending", "resolved", etc.)
 * @param limit - Maximum number of alerts to fetch
 * @returns Promise with alerts data
 */
export async function fetchAlerts(
    statusFilter: string = "all", 
    limit: number = 100
): Promise<AssetPerimeterAlertWithDetails[]> {
    const params = new URLSearchParams();
    if (statusFilter !== "all") {
        params.set("status", statusFilter);
    }
    params.set("limit", String(limit));

    const response = await fetch(`/api/kiosk-management/asset-alert?${params.toString()}`);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as { 
        success: boolean; 
        alerts: AssetPerimeterAlertWithDetails[];
        message?: string;
    };

    if (!data.success) {
        throw new Error(data.message || "Failed to fetch alerts");
    }

    return data.alerts;
}

/**
 * Scan RFID and create alert if needed
 * @param rfidCode - The RFID code scanned
 * @param scannerGateId - Gate/scanner identifier
 * @param scannerLocationName - Location name
 * @returns Promise with scan response
 */
export async function scanRFID(
    rfidCode: string,
    scannerGateId: string = "GATE-001",
    scannerLocationName: string = "Main Gate"
): Promise<RFIDScanResponse> {
    const response = await fetch("/api/kiosk-management/asset-alert", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            rfidCode,
            scannerGateId,
            scannerLocationName,
        }),
    });

    // Handle both successful responses and expected error responses (404, etc.)
    if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as RFIDScanResponse;

    // Don't throw error if noAlert flag is set (means asset found but conditions not met)
    if (!data.success && !data.noAlert) {
        throw new Error(data.message || "Failed to scan RFID");
    }

    return data;
}


/**
 * Delete an alert by ID
 * @param alertId - ID of the alert to delete
 * @returns Promise that resolves to true if successful
 */
export async function deleteAlert(alertId: number): Promise<boolean> {
    const response = await fetch(`/api/kiosk-management/asset-alert?alertId=${alertId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as {
        success: boolean;
        message?: string;
    };

    if (!data.success) {
        throw new Error(data.message || "Failed to delete alert");
    }

    return true;
}


/**
 * Fetch a single alert by ID
 * @param alertId - ID of the alert to fetch
 * @returns Promise with alert data or null if not found
 */
export async function fetchAlertById(alertId: number): Promise<AssetPerimeterAlertWithDetails | null> {
    const params = new URLSearchParams();
    params.set("alertId", String(alertId));

    const response = await fetch(`/api/kiosk-management/asset-alert?${params.toString()}`);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as { 
        success: boolean; 
        alert?: AssetPerimeterAlertWithDetails;
        message?: string;
    };

    if (!data.success) {
        throw new Error(data.message || "Failed to fetch alert");
    }

    return data.alert || null;
}

/**
 * Update alert status
 * @param alertId - ID of the alert to update
 * @param status - New status value
 * @param remarks - Optional remarks
 * @returns Promise that resolves to true if successful
 */
export async function updateAlertStatus(
    alertId: number, 
    status: string, 
    remarks?: string
): Promise<boolean> {
    const response = await fetch(`/api/kiosk-management/asset-alert`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            alertId,
            status,
            remarks,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as {
        success: boolean;
        message?: string;
    };

    if (!data.success) {
        throw new Error(data.message || "Failed to update alert status");
    }

    return true;
}

