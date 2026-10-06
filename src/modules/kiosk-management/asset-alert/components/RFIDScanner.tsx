"use client";

// Extend Window interface for webkit audio context support
declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScanLine, AlertTriangle, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { AssetPerimeterAlertWithDetails } from "../type";
import { scanRFID } from "../providers/fetchProvider";

interface RFIDScannerProps {
    onAlertCreated?: () => void;
    scannerGateId?: string;
    scannerLocationName?: string;
}

export function RFIDScanner({ 
    onAlertCreated, 
    scannerGateId = "GATE-001", 
    scannerLocationName = "Main Gate" 
}: RFIDScannerProps) {
    const [rfidCode, setRfidCode] = React.useState("");
    const [isScanning, setIsScanning] = React.useState(false);
    const [showAlertModal, setShowAlertModal] = React.useState(false);
    const [alertData, setAlertData] = React.useState<{
        message: string;
        alert?: AssetPerimeterAlertWithDetails;
        rfidCode: string;
    } | null>(null);
    const [lastScanResult, setLastScanResult] = React.useState<{
        success: boolean;
        message: string;
        timestamp: Date;
    } | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const audioContextRef = React.useRef<AudioContext | null>(null);

    // Auto-focus input on mount
    React.useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Keep input always focused (but not when user is interacting with other UI elements)
    React.useEffect(() => {
        const interval = setInterval(() => {
            // Don't steal focus if user is interacting with popovers, dialogs, or buttons
            const activeElement = document.activeElement;
            const isInPopover = activeElement?.closest('[data-slot="popover-content"]');
            const isInDialog = activeElement?.closest('[role="dialog"]');
            const isButton = activeElement?.tagName === 'BUTTON';
            const isInput = activeElement?.tagName === 'INPUT';
            const isInCalendar = activeElement?.closest('[data-slot="calendar"]');

            // Only refocus if not interacting with UI elements
            if (!isInPopover && !isInDialog && !isButton && !isInCalendar && !isInput && document.activeElement !== inputRef.current) {
                inputRef.current?.focus();
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    // Re-focus after modal closes (but not if user is interacting with other elements)
    React.useEffect(() => {
        if (!showAlertModal) {
            setTimeout(() => {
                const activeElement = document.activeElement;
                const isInPopover = activeElement?.closest('[data-slot="popover-content"]');
                const isInDialog = activeElement?.closest('[role="dialog"]');
                const isInput = activeElement?.tagName === 'INPUT';
                const isInCalendar = activeElement?.closest('[data-slot="calendar"]');

                if (!isInPopover && !isInDialog && !isInput && !isInCalendar) {
                    inputRef.current?.focus();
                }
            }, 100);
        }
    }, [showAlertModal]);

    // Play alert sound when modal opens
    React.useEffect(() => {
        if (showAlertModal) {
            playAlertSound();
            
            // Auto-close modal after 5 seconds (when sound finishes)
            const timer = setTimeout(() => {
                setShowAlertModal(false);
            }, 5000);
            
            // Cleanup timer if modal is closed manually
            return () => clearTimeout(timer);
        }
    }, [showAlertModal]);

    // Function to play "buzz buzz" warning sound for 5 seconds
    const playAlertSound = () => {
        try {
            // Create audio context if it doesn't exist
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const audioContext = audioContextRef.current;
            const now = audioContext.currentTime;
            
            // Helper function to create a single buzz
            const createBuzz = (startTime: number) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(150, startTime);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
                gainNode.gain.linearRampToValueAtTime(0, startTime + 0.4);
                oscillator.start(startTime);
                oscillator.stop(startTime + 0.4);
            };
            
            // Play buzz buzz pattern repeatedly for 5 seconds
            // Each "buzz buzz" takes 0.9 seconds, repeat pattern to fill 5 seconds
            createBuzz(now);           // BUZZ
            createBuzz(now + 0.5);     // BUZZ
            createBuzz(now + 1.0);     // BUZZ
            createBuzz(now + 1.5);     // BUZZ
            createBuzz(now + 2.0);     // BUZZ
            createBuzz(now + 2.5);     // BUZZ
            createBuzz(now + 3.0);     // BUZZ
            createBuzz(now + 3.5);     // BUZZ
            createBuzz(now + 4.0);     // BUZZ
            createBuzz(now + 4.5);     // BUZZ (final buzz ends at ~4.9 seconds)
            
        } catch (error) {
            console.error("Error playing alert sound:", error);
        }
    };

    const handleScan = async () => {
        const trimmedCode = rfidCode.trim();
        
        if (!trimmedCode) {
            toast.error("Please enter an RFID code");
            return;
        }

        setIsScanning(true);
        
        try {
            const data = await scanRFID(trimmedCode, scannerGateId, scannerLocationName);

            if (data.success) {
                // Alert was triggered - show modal
                setAlertData({
                    message: data.message,
                    alert: data.alert,
                    rfidCode: trimmedCode,
                });
                setShowAlertModal(true);
                
                toast.error(data.message, {
                    duration: 5000,
                    icon: <AlertTriangle className="h-5 w-5" />,
                });
                setLastScanResult({
                    success: true,
                    message: data.message,
                    timestamp: new Date(),
                });
                onAlertCreated?.();
            } else if ("noAlert" in data && data.noAlert) {
                // Asset found but no alert triggered - no toast, just update last scan result
                setLastScanResult({
                    success: false,
                    message: data.message,
                    timestamp: new Date(),
                });
            } else {
                // Error or asset not found
                toast.warning(data.message, {
                    duration: 3000,
                });
                setLastScanResult({
                    success: false,
                    message: data.message,
                    timestamp: new Date(),
                });
            }
        } catch (error) {
            console.error("Error scanning RFID:", error);
            toast.error("Failed to scan RFID. Please try again.");
            setLastScanResult({
                success: false,
                message: "Connection error. Please try again.",
                timestamp: new Date(),
            });
        } finally {
            setIsScanning(false);
            setRfidCode("");
            // Re-focus input for next scan (but not if user is interacting with other elements)
            setTimeout(() => {
                const activeElement = document.activeElement;
                const isInPopover = activeElement?.closest('[data-slot="popover-content"]');
                const isInDialog = activeElement?.closest('[role="dialog"]');
                const isInput = activeElement?.tagName === 'INPUT';
                const isInCalendar = activeElement?.closest('[data-slot="calendar"]');

                if (!isInPopover && !isInDialog && !isInput && !isInCalendar) {
                    inputRef.current?.focus();
                }
            }, 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !isScanning) {
            void handleScan();
        }
    };

    return (
        <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ScanLine className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">RFID Scanner</h2>
                    <p className="text-sm text-muted-foreground">
                        {scannerLocationName} ({scannerGateId})
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="rfid-input" className="text-sm font-medium">
                        Scan or Enter RFID Code
                    </label>
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            id="rfid-input"
                            type="text"
                            value={rfidCode}
                            onChange={(e) => setRfidCode(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => {
                                // Only refocus if not clicking on UI elements
                                setTimeout(() => {
                                    const activeElement = document.activeElement;
                                    const isInPopover = activeElement?.closest('[data-slot="popover-content"]');
                                    const isInDialog = activeElement?.closest('[role="dialog"]');
                                    const isButton = activeElement?.tagName === 'BUTTON';
                                    const isInput = activeElement?.tagName === 'INPUT';
                                    const isInCalendar = activeElement?.closest('[data-slot="calendar"]');

                                    if (!isInPopover && !isInDialog && !isButton && !isInput && !isInCalendar) {
                                        inputRef.current?.focus();
                                    }
                                }, 10);
                            }}
                            placeholder="Scan RFID code..."
                            disabled={isScanning}
                            className="font-mono text-lg"
                            autoComplete="off"
                        />
                        <Button 
                            onClick={handleScan} 
                            disabled={isScanning || !rfidCode.trim()}
                            size="lg"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <ScanLine className="h-4 w-4 mr-2" />
                                    Scan
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Last Scan Result */}
                {lastScanResult && (
                    <div className={`p-4 rounded-lg border ${
                        lastScanResult.success 
                            ? "bg-destructive/10 border-destructive/20" 
                            : "bg-muted/50 border-border"
                    }`}>
                        <div className="flex items-start gap-3">
                            {lastScanResult.success ? (
                                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                            ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                            )}
                            <div className="flex-1 space-y-1">
                                <p className={`text-sm font-medium ${
                                    lastScanResult.success ? "text-destructive" : "text-foreground"
                                }`}>
                                    {lastScanResult.message}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {lastScanResult.timestamp.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: true
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Alert Warning Modal */}
            <AlertDialog open={showAlertModal} onOpenChange={setShowAlertModal}>
                <AlertDialogContent className="max-w-lg border-destructive/50">
                    <AlertDialogHeader className="space-y-3 text-center items-center">
                        <AlertDialogMedia className="bg-destructive text-destructive-foreground mx-auto">
                            <ShieldAlert className="h-12 w-12" />
                        </AlertDialogMedia>
                        <div className="space-y-1 w-full flex flex-col items-center">
                            <AlertDialogTitle className="text-destructive text-2xl font-bold">
                                ⚠️ SECURITY ALERT
                            </AlertDialogTitle>
                            <p className="text-sm font-semibold text-destructive/80 uppercase tracking-wider">
                                Assets Attempting to Leave Premises
                            </p>
                            <AlertDialogDescription asChild>
                                <span className="sr-only">Security alert details</span>
                            </AlertDialogDescription>
                        </div>
                    </AlertDialogHeader>
                    
                    <div className="space-y-4 px-6 pb-6">
                        {/* Main Alert Message */}
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                            <p className="font-semibold text-destructive text-center text-lg">
                                {alertData?.message || "Unauthorized asset movement detected!"}
                            </p>
                        </div>
                        
                        {/* Alert Details */}
                        {alertData?.alert && (
                            <div className="space-y-3">
                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-start gap-3 pb-3 border-b">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <ScanLine className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                                                RFID Code
                                            </p>
                                            <p className="font-mono text-sm font-semibold break-all">
                                                {alertData.rfidCode}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                                                Item Name
                                            </p>
                                            <p className="text-sm font-semibold">
                                                {alertData.alert.asset_details?.item_name || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                                                Serial Number
                                            </p>
                                            <p className="text-sm font-semibold font-mono">
                                                {alertData.alert.asset_details?.serial || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                                                Location
                                            </p>
                                            <p className="text-sm font-semibold">
                                                {alertData.alert.scanner_location_name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                                                Gate ID
                                            </p>
                                            <p className="text-sm font-semibold font-mono">
                                                {alertData.alert.scanner_gate_id}
                                            </p>
                                        </div>
                                        {alertData.alert.accountable_user_name && (
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                                                   Accountable
                                                </p>
                                                <p className="text-sm font-semibold">
                                                    {alertData.alert.accountable_user_name}
                                                </p>
                                            </div>
                                        )}
                                        {alertData.alert.asset_details?.encoder_name && (
                                            <div>
                                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                                                    Encoder
                                                </p>
                                                <p className="text-sm font-semibold">
                                                    {alertData.alert.asset_details.encoder_name}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="pt-2 border-t">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                                            Detected At
                                        </p>
                                        <p className="text-sm font-semibold">
                                            {alertData?.alert?.scanned_at 
                                                ? (() => {
                                                    // Ensure the date is parsed as UTC
                                                    // const dateStr = alertData.alert.scanned_at.endsWith('Z') 
                                                    // ? alertData.alert.scanned_at 
                                                    // : alertData.alert.scanned_at;
                                                   const date = new Date(alertData.alert.scanned_at);
                                                    return date.toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    }) + ' ' + date.toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit',
                                                        hour12: true
                                                    });
                                                })()
                                                : (() => {
                                                    const date = new Date();
                                                    return date.toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    }) + ' ' + date.toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit',
                                                        hour12: true
                                                    });
                                                })()
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}