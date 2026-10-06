import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

interface AssetAndEquipment {
    id: number;
    rfid_code: string | null;
    is_active: number;
    is_active_warning: number;
    employee: number | null;
    encoder: number | null;
    serial: string | null;
    barcode: string | null;
    item_id: number | null;
}



/**
 * POST /api/kiosk-management/asset-alert
 * Scans RFID, checks if asset has warning enabled, and creates alert if needed
 */
export async function POST(request: NextRequest) {
    console.log("\n======= ASSET ALERT POST REQUEST START =======");
    try {
        // Read token from cookies
        const cookieStore = await cookies();
        const kioskTokenCookie = cookieStore.get("kiosk_token");
        
        let userContext = null;
        if (kioskTokenCookie) {
            try {
                const decoded = JSON.parse(atob(kioskTokenCookie.value));
                userContext = decoded;
                console.log("[Asset Alert POST] User Context from Cookie:", JSON.stringify(userContext, null, 2));
            } catch (err) {
                console.warn("[Asset Alert POST] Failed to decode kiosk_token:", err);
            }
        }

        const body = await request.json() as { 
            rfidCode?: string; 
            scannerGateId?: string;
            scannerLocationName?: string;
        };
        console.log("[Asset Alert POST] Request Body:", JSON.stringify(body, null, 2));
        
        const rfidCode = body.rfidCode?.trim();
        console.log("[Asset Alert POST] RFID Code (trimmed):", rfidCode);

        if (!rfidCode) {
            console.warn("[Asset Alert POST] No RFID code provided");
            return NextResponse.json(
                { success: false, message: "RFID code is required." },
                { status: 400 }
            );
        }

        if (!API_BASE) {
            console.error("[Asset Alert POST] Missing NEXT_PUBLIC_API_BASE_URL");
            return NextResponse.json(
                { success: false, message: "Server configuration error." },
                { status: 500 }
            );
        }

        console.log("[Asset Alert POST] API Base URL:", API_BASE);
        console.log("[Asset Alert POST] Has Auth Token:", !!TOKEN);

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (TOKEN) {
            headers["Authorization"] = `Bearer ${TOKEN}`;
        }

        // Step 1: Find asset by RFID code
        const assetQs = new URLSearchParams({
            "filter[rfid_code][_eq]": rfidCode,
            "fields": "id,rfid_code,is_active,is_active_warning,employee,encoder,serial,barcode,item_id",
            "limit": "1",
        });

        const assetUrl = `${API_BASE}/items/assets_and_equipment?${assetQs.toString()}`;
        console.log("[Asset Alert POST] === STEP 1: Fetching Asset ===");
        console.log("[Asset Alert POST] Asset URL:", assetUrl);
        console.log("[Asset Alert POST] Request Headers:", JSON.stringify(headers, null, 2));

        const assetRes = await fetch(assetUrl, { headers });
        console.log("[Asset Alert POST] Asset Response Status:", assetRes.status, assetRes.statusText);
        
        const assetData = await assetRes.json() as { data: AssetAndEquipment[] };
        console.log("[Asset Alert POST] Asset Response Data:", JSON.stringify(assetData, null, 2));
        console.log("[Asset Alert POST] Assets Found:", assetData.data?.length || 0);

        if (!assetRes.ok || !assetData.data || assetData.data.length === 0) {
            console.error("[Asset Alert POST] Asset NOT FOUND for RFID:", rfidCode);
            console.log("======= ASSET ALERT POST REQUEST END (404) =======\n");
            return NextResponse.json(
                { 
                    success: false, 
                    message: "Asset not found. RFID code does not match any registered asset." 
                },
                { status: 404 }
            );
        }

        const asset = assetData.data[0];
        console.log("[Asset Alert POST] Asset Found:", JSON.stringify(asset, null, 2));

        // Step 2: Check if BOTH is_active AND is_active_warning are 1
        console.log("[Asset Alert POST] === STEP 2: Checking Alert Conditions ===");
        console.log("[Asset Alert POST] is_active:", asset.is_active, "(must be 1)");
        console.log("[Asset Alert POST] is_active_warning:", asset.is_active_warning, "(must be 1)");
        
        if (asset.is_active !== 1 || asset.is_active_warning !== 1) {
            // const reasons = [];
            // if (asset.is_active !== 1) reasons.push("asset is not active");
            // if (asset.is_active_warning !== 1) reasons.push("warning is not enabled");
            
            // console.warn("[Asset Alert POST] Alert NOT triggered. Reasons:", reasons.join(", "));
             console.warn("[Asset Alert POST] Alert NOT triggered. Reasons:");
            console.log("======= ASSET ALERT POST REQUEST END (No Alert) =======\n");
            return NextResponse.json(
                { 
                    success: false, 
                    // message: `Asset found  (${reasons.join(", ")}).`,
                    //  message: `Asset found.`,
                    noAlert: true 
                },
                { status: 200 }
            );
        }
        
        console.log("[Asset Alert POST] ✅ Both conditions met! Triggering alert...");

        // Step 3: Create alert in asset_perimeter_alerts
        // Format date as GMT+8 local time without timezone indicator
        // This ensures Directus stores the actual local time as-is
        const now = new Date();
        // Shift to GMT+8
        const gmt8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        // Extract components as UTC (representing GMT+8 after shift)
        const year = gmt8Time.getUTCFullYear();
        const month = String(gmt8Time.getUTCMonth() + 1).padStart(2, '0');
        const day = String(gmt8Time.getUTCDate()).padStart(2, '0');
        const hours = String(gmt8Time.getUTCHours()).padStart(2, '0');
        const minutes = String(gmt8Time.getUTCMinutes()).padStart(2, '0');
        const seconds = String(gmt8Time.getUTCSeconds()).padStart(2, '0');
        // No timezone indicator - Directus will store as-is
        const scannedAt = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
        
        const alertPayload = {
            asset_id: asset.id,
            accountable_user_id: asset.employee || null,
            scanner_gate_id: body.scannerGateId || "GATE-001",
            scanner_location_name: body.scannerLocationName || "Main Gate",
            scanned_at: scannedAt,
            alert_status: "New",
        };
        console.log("[Asset Alert POST] Alert Payload:", JSON.stringify(alertPayload, null, 2));

        const createAlertUrl = `${API_BASE}/items/asset_perimeter_alerts`;
        console.log("[Asset Alert POST] === STEP 3: Creating Alert ===");
        console.log("[Asset Alert POST] Create Alert URL:", createAlertUrl);
        console.log("[Asset Alert POST] Alert Payload:", JSON.stringify(alertPayload, null, 2));

        const createAlertRes = await fetch(createAlertUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(alertPayload),
        });

        console.log("[Asset Alert POST] Create Alert Response Status:", createAlertRes.status, createAlertRes.statusText);
        const alertResponseData = await createAlertRes.json() as { data: { alert_id: number } };
        console.log("[Asset Alert POST] Create Alert Response Data:", JSON.stringify(alertResponseData, null, 2));

        if (!createAlertRes.ok) {
            console.error("[Asset Alert POST] ❌ Failed to create alert:", alertResponseData);
            console.log("======= ASSET ALERT POST REQUEST END (Error) =======\n");
            return NextResponse.json(
                { 
                    success: false, 
                    message: "Failed to create alert. Please contact administrator." 
                },
                { status: 500 }
            );
        }

        console.log("[Asset Alert POST] ✅ Alert created successfully!");
        console.log("[Asset Alert POST] Alert ID:", alertResponseData.data.alert_id);

        // Step 4: Enrich alert response with item name, employee name, and encoder name
        let itemName = "Unknown Asset";
        let employeeName = null;
        let encoderName = null;
        let accountableUserName = null;

        try {
            // Fetch item name if item_id exists
            if (asset.item_id) {
                const itemQs = new URLSearchParams({
                    "filter[id][_eq]": String(asset.item_id),
                    "fields": "id,item_name",
                    "limit": "1",
                });
                const itemUrl = `${API_BASE}/items/items?${itemQs.toString()}`;
                const itemRes = await fetch(itemUrl, { headers });
                
                if (itemRes.ok) {
                    const itemData = await itemRes.json() as { data: Array<{ id: number; item_name: string }> };
                    const item = itemData.data?.[0];
                    if (item) {
                        itemName = item.item_name;
                    }
                }
            }
            
            // Fetch accountable user name (from accountable_user_id)
            if (asset.employee) {
                const accountableQs = new URLSearchParams({
                    "filter[user_id][_eq]": String(asset.employee),
                    "fields": "user_id,user_fname,user_lname",
                    "limit": "1",
                });
                const accountableUrl = `${API_BASE}/items/user?${accountableQs.toString()}`;
                const accountableRes = await fetch(accountableUrl, { headers });
                
                if (accountableRes.ok) {
                    const accountableData = await accountableRes.json() as { data: Array<{
                        user_id: number;
                        user_fname: string;
                        user_lname: string;
                    }> };
                    const accountable = accountableData.data?.[0];
                    if (accountable) {
                        accountableUserName = `${accountable.user_fname} ${accountable.user_lname}`;
                    }
                }
            }
            
            // Fetch employee name if employee exists
            if (asset.employee) {
                const employeeQs = new URLSearchParams({
                    "filter[user_id][_eq]": String(asset.employee),
                    "fields": "user_id,user_fname,user_lname",
                    "limit": "1",
                });
                const employeeUrl = `${API_BASE}/items/user?${employeeQs.toString()}`;
                const employeeRes = await fetch(employeeUrl, { headers });
                
                if (employeeRes.ok) {
                    const employeeData = await employeeRes.json() as { data: Array<{
                        user_id: number;
                        user_fname: string;
                        user_lname: string;
                    }> };
                    const employee = employeeData.data?.[0];
                    if (employee) {
                        employeeName = `${employee.user_fname} ${employee.user_lname}`;
                    }
                }
            }
            
            // Fetch encoder name if encoder exists
            if (asset.encoder) {
                const encoderQs = new URLSearchParams({
                    "filter[user_id][_eq]": String(asset.encoder),
                    "fields": "user_id,user_fname,user_lname",
                    "limit": "1",
                });
                const encoderUrl = `${API_BASE}/items/user?${encoderQs.toString()}`;
                const encoderRes = await fetch(encoderUrl, { headers });
                
                if (encoderRes.ok) {
                    const encoderData = await encoderRes.json() as { data: Array<{
                        user_id: number;
                        user_fname: string;
                        user_lname: string;
                    }> };
                    const encoder = encoderData.data?.[0];
                    if (encoder) {
                        encoderName = `${encoder.user_fname} ${encoder.user_lname}`;
                    }
                }
            }
        } catch (enrichError) {
            console.error("[Asset Alert POST] Error enriching alert details:", enrichError);
            // Continue anyway - alert was already created successfully
        }

        console.log("======= ASSET ALERT POST REQUEST END (Success) =======\n");

        return NextResponse.json(
            { 
                success: true, 
                message: "Warning",
                alert: {
                    alert_id: alertResponseData.data.alert_id,
                    ...alertPayload,
                    accountable_user_name: accountableUserName,
                    asset_details: {
                        item_name: itemName,
                        serial: asset.serial,
                        barcode: asset.barcode,
                        employee_name: employeeName,
                        encoder_name: encoderName,
                    }
                },
                userContext: userContext // Include user context from cookie
            },
            { status: 201 }
        );

    } catch (err) {
        console.error("[Asset Alert] Unexpected error:", err);
        return NextResponse.json(
            { success: false, message: "Internal server error.", error: String(err) },
            { status: 500 }
        );
    }
}

/**
 * GET /api/kiosk-management/asset-alert
 * Fetches all alerts with asset details
 */
export async function GET(request: NextRequest) {
    console.log("\n======= ASSET ALERT GET REQUEST START =======");
    console.log("[Asset Alert GET] Request URL:", request.url);
    try {
        // Read token from cookies
        const cookieStore = await cookies();
        const kioskTokenCookie = cookieStore.get("kiosk_token");
        
        let userContext = null;
        if (kioskTokenCookie) {
            try {
                const decoded = JSON.parse(atob(kioskTokenCookie.value));
                userContext = decoded;
                console.log("[Asset Alert GET] User Context from Cookie:", JSON.stringify(userContext, null, 2));
            } catch (err) {
                console.warn("[Asset Alert GET] Failed to decode kiosk_token:", err);
            }
        }

        if (!API_BASE) {
            console.error("[Asset Alert GET] Missing NEXT_PUBLIC_API_BASE_URL");
            return NextResponse.json(
                { success: false, message: "Server configuration error." },
                { status: 500 }
            );
        }

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (TOKEN) {
            headers["Authorization"] = `Bearer ${TOKEN}`;
        }

        // Get search params from the request URL
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const limit = searchParams.get("limit") || "100";

        // Build query for alerts
        const alertQs = new URLSearchParams({
            "fields": "alert_id,asset_id,accountable_user_id,scanner_gate_id,scanner_location_name,scanned_at,alert_status,resolved_by,resolution_remarks,resolved_at",
            "limit": limit,
            "sort": "-scanned_at", // Most recent first
        });

        if (status) {
            alertQs.set("filter[alert_status][_eq]", status);
        }

        const alertsUrl = `${API_BASE}/items/asset_perimeter_alerts?${alertQs.toString()}`;
        console.log("[Asset Alert GET] Alerts URL:", alertsUrl);
        console.log("[Asset Alert GET] Query Params - Status:", status || "all", "Limit:", limit);

        const alertsRes = await fetch(alertsUrl, { headers });
        console.log("[Asset Alert GET] Alerts Response Status:", alertsRes.status);
        const alertsData = await alertsRes.json() as { data: Array<{
            alert_id: number;
            asset_id: number;
            accountable_user_id: number | null;
            scanner_gate_id: string | null;
            scanner_location_name: string | null;
            scanned_at: string;
            alert_status: string;
            resolved_by: number | null;
            resolution_remarks: string | null;
            resolved_at: string | null;
        }> };

        if (!alertsRes.ok) {
            return NextResponse.json(
                { success: false, message: "Failed to fetch alerts." },
                { status: 502 }
            );
        }

        const alerts = alertsData.data || [];

        // Enrich alerts with asset details
        const enrichedAlerts = await Promise.all(
            alerts.map(async (alert) => {
                try {
                    // Fetch asset details including item_id, employee, and encoder
                    const assetQs = new URLSearchParams({
                        "filter[id][_eq]": String(alert.asset_id),
                        "fields": "id,serial,barcode,item_id,employee,encoder",
                        "limit": "1",
                    });

                    const assetUrl = `${API_BASE}/items/assets_and_equipment?${assetQs.toString()}`;
                    const assetRes = await fetch(assetUrl, { headers });
                    const assetData = await assetRes.json() as { data: Array<{
                        id: number;
                        serial: string | null;
                        barcode: string | null;
                        item_id: number | null;
                        employee: number | null;
                        encoder: number | null;
                    }> };

                    const asset = assetData.data?.[0];
                    let itemName = "Unknown Asset";
                    const typeName = "";
                    const classificationName = "";

                    // Fetch item details if item_id exists
                    if (asset?.item_id) {
                        const itemQs = new URLSearchParams({
                            "filter[id][_eq]": String(asset.item_id),
                            "fields": "id,item_name,item_type,item_classification",
                            "limit": "1",
                        });

                        const itemUrl = `${API_BASE}/items/items?${itemQs.toString()}`;
                        const itemRes = await fetch(itemUrl, { headers });
                        
                        if (itemRes.ok) {
                            const itemData = await itemRes.json() as { data: Array<{
                                id: number;
                                item_name: string;
                                item_type: number | null;
                                item_classification: number | null;
                            }> };
                            
                            const item = itemData.data?.[0];
                            if (item) {
                                itemName = item.item_name;
                            }
                        }
                    }

                    // Fetch accountable user name if accountable_user_id exists
                    let accountableUserName = null;
                    if (alert.accountable_user_id) {
                        const userQs = new URLSearchParams({
                            "filter[user_id][_eq]": String(alert.accountable_user_id),
                            "fields": "user_id,user_fname,user_lname",
                            "limit": "1",
                        });

                        const userUrl = `${API_BASE}/items/user?${userQs.toString()}`;
                        const userRes = await fetch(userUrl, { headers });
                        
                        if (userRes.ok) {
                            const userData = await userRes.json() as { data: Array<{
                                user_id: number;
                                user_fname: string;
                                user_lname: string;
                            }> };
                            
                            const user = userData.data?.[0];
                            if (user) {
                                accountableUserName = `${user.user_fname} ${user.user_lname}`;
                            }
                        }
                    }

                    // Fetch employee name if employee exists in asset
                    let employeeName = null;
                    if (asset?.employee) {
                        const employeeQs = new URLSearchParams({
                            "filter[user_id][_eq]": String(asset.employee),
                            "fields": "user_id,user_fname,user_lname",
                            "limit": "1",
                        });

                        const employeeUrl = `${API_BASE}/items/user?${employeeQs.toString()}`;
                        const employeeRes = await fetch(employeeUrl, { headers });
                        
                        if (employeeRes.ok) {
                            const employeeData = await employeeRes.json() as { data: Array<{
                                user_id: number;
                                user_fname: string;
                                user_lname: string;
                            }> };
                            
                            const employee = employeeData.data?.[0];
                            if (employee) {
                                employeeName = `${employee.user_fname} ${employee.user_lname}`;
                            }
                        }
                    }

                    // Fetch encoder name if encoder exists in asset
                    let encoderName = null;
                    if (asset?.encoder) {
                        const encoderQs = new URLSearchParams({
                            "filter[user_id][_eq]": String(asset.encoder),
                            "fields": "user_id,user_fname,user_lname",
                            "limit": "1",
                        });

                        const encoderUrl = `${API_BASE}/items/user?${encoderQs.toString()}`;
                        const encoderRes = await fetch(encoderUrl, { headers });
                        
                        if (encoderRes.ok) {
                            const encoderData = await encoderRes.json() as { data: Array<{
                                user_id: number;
                                user_fname: string;
                                user_lname: string;
                            }> };
                            
                            const encoder = encoderData.data?.[0];
                            if (encoder) {
                                encoderName = `${encoder.user_fname} ${encoder.user_lname}`;
                            }
                        }
                    }

                    return {
                        ...alert,
                        asset_details: {
                            item_name: itemName,
                            type_name: typeName,
                            classification_name: classificationName,
                            serial: asset?.serial || null,
                            barcode: asset?.barcode || null,
                            employee_name: employeeName,
                            encoder_name: encoderName,
                        },
                        accountable_user_name: accountableUserName,
                    };
                } catch (error) {
                    console.error("[Asset Alert] Error enriching alert:", error);
                    return {
                        ...alert,
                        asset_details: {
                            item_name: "Error loading details",
                        },
                    };
                }
            })
        );
        console.log(TOKEN)
        console.log(API_BASE)
        console.log("[Asset Alert GET] Successfully fetched and enriched", enrichedAlerts.length, "alerts");
        console.log("======= ASSET ALERT GET REQUEST END (Success) =======\n");
        
        return NextResponse.json(
            { 
                success: true, 
                alerts: enrichedAlerts,
                total: enrichedAlerts.length 
            },
            { status: 200 }
        );

    } catch (err) {
        console.error("[Asset Alert GET] ❌ Unexpected error:", err);
        console.log("======= ASSET ALERT GET REQUEST END (Error) =======\n");
        return NextResponse.json(
            { success: false, message: "Internal server error.", error: String(err) },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/kiosk-management/asset-alert?alertId=123
 * Deletes an alert by ID
 */
export async function DELETE(request: NextRequest) {
    console.log("\n======= ASSET ALERT DELETE REQUEST START =======");
    try {
        // Read token from cookies
        const cookieStore = await cookies();
        const kioskTokenCookie = cookieStore.get("kiosk_token");
        
        let userContext = null;
        if (kioskTokenCookie) {
            try {
                const decoded = JSON.parse(atob(kioskTokenCookie.value));
                userContext = decoded;
                console.log("[Asset Alert DELETE] User Context from Cookie:", JSON.stringify(userContext, null, 2));
            } catch (err) {
                console.warn("[Asset Alert DELETE] Failed to decode kiosk_token:", err);
            }
        }

        const { searchParams } = new URL(request.url);
        const alertId = searchParams.get("alertId");

        if (!alertId) {
            console.warn("[Asset Alert DELETE] No alert ID provided");
            return NextResponse.json(
                { success: false, message: "Alert ID is required." },
                { status: 400 }
            );
        }

        if (!API_BASE) {
            console.error("[Asset Alert DELETE] Missing NEXT_PUBLIC_API_BASE_URL");
            return NextResponse.json(
                { success: false, message: "Server configuration error." },
                { status: 500 }
            );
        }

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (TOKEN) {
            headers["Authorization"] = `Bearer ${TOKEN}`;
        }

        const deleteUrl = `${API_BASE}/items/asset_perimeter_alerts/${alertId}`;
        console.log("[Asset Alert DELETE] Delete URL:", deleteUrl);
        console.log("[Asset Alert DELETE] Deleting Alert ID:", alertId);

        const deleteRes = await fetch(deleteUrl, {
            method: "DELETE",
            headers,
        });

        console.log("[Asset Alert DELETE] Response Status:", deleteRes.status);

        if (!deleteRes.ok) {
            const errorText = await deleteRes.text();
            console.error("[Asset Alert DELETE] Failed to delete:", errorText);
            return NextResponse.json(
                { success: false, message: "Failed to delete alert." },
                { status: 502 }
            );
        }

        console.log("[Asset Alert DELETE] ✅ Alert deleted successfully");
        console.log("======= ASSET ALERT DELETE REQUEST END (Success) =======\n");

        return NextResponse.json(
            { success: true, message: "Alert deleted successfully." },
            { status: 200 }
        );

    } catch (err) {
        console.error("[Asset Alert DELETE] ❌ Unexpected error:", err);
        console.log("======= ASSET ALERT DELETE REQUEST END (Error) =======\n");
        return NextResponse.json(
            { success: false, message: "Internal server error.", error: String(err) },
            { status: 500 }
        );
    }
}
