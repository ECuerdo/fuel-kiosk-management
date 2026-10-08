"use client";

import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScanLine, CreditCard, ArrowRight, Fuel, Sparkles, Loader2 } from "lucide-react";
import { formatCountdown } from "@/lib/attempt-limiter";

interface RFIDScannerInputProps {
    rfid: string;
    onRfidChange: (value: string) => void;
    onSubmit: (rfid: string) => void;
    loading: boolean;
    error: string | null;
    lockoutSeconds: number;
}

export function RFIDScannerInput({
    rfid,
    onRfidChange,
    onSubmit,
    loading,
    error,
    lockoutSeconds,
}: RFIDScannerInputProps) {
    const paused = lockoutSeconds > 0;
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rfid.trim() && !paused) {
            onSubmit(rfid.trim());
        }
    };

    return (
        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto space-y-2 sm:space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Title */}
            <div className="text-center space-y-1 sm:space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-sm">
                    <Fuel className="h-3.5 w-3.5 animate-pulse" />
                    <span>Fuel Kiosk</span>
                </div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase italic leading-none">
                    Tap your RFID Card
                </h1>
                <p className="text-muted-foreground text-[11px] sm:text-xs md:text-sm font-medium leading-relaxed max-w-md mx-auto">
                    Scan employee card or type RFID card number to proceed.
                </p>
            </div>

            {/* Scanning Card UI */}
            <Card className="relative overflow-hidden border-2 border-primary/20 shadow-xl rounded-2xl bg-card/90 backdrop-blur-xl">
                <CardContent className="p-3 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
                    {/* Scanner Visual Icon Container */}
                    <div className="flex flex-col items-center justify-center p-3 sm:p-5 border-2 border-dashed border-primary/30 rounded-xl bg-muted/30 relative">
                        <div className="flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full bg-primary/10 border border-primary/30 text-primary shadow-md">
                            {loading ? (
                                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 animate-spin text-primary" />
                            ) : (
                                <ScanLine className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-primary animate-pulse" />
                            )}
                        </div>

                        <div className="mt-2 text-center space-y-0.5">
                            <p className="font-bold text-xs sm:text-sm md:text-base text-foreground tracking-wide uppercase leading-none">
                                {loading ? "Verifying RFID..." : "Ready to Scan"}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                                Hold RFID card near reader
                            </p>
                        </div>
                    </div>

                    {/* Input Form */}
                    <form onSubmit={handleSubmit} className="space-y-2">
                        <div className="space-y-1">
                            <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <CreditCard className="h-3.5 w-3.5 text-primary" />
                                RFID Card Number
                            </label>
                            <div className="relative flex gap-1.5">
                                <Input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Enter or scan RFID card number..."
                                    value={rfid}
                                    onChange={(e) => onRfidChange(e.target.value)}
                                    disabled={loading || paused}
                                    className="h-10 sm:h-12 px-3 rounded-xl text-xs sm:text-base font-mono font-bold tracking-wider border-2 border-border focus-visible:border-primary shadow-inner bg-background/50"
                                    autoComplete="off"
                                />
                                <Button
                                    type="submit"
                                    disabled={loading || paused || !rfid.trim()}
                                    className="h-10 sm:h-12 px-4 rounded-xl font-bold gap-1 text-xs sm:text-sm shadow-md shrink-0"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            Verify
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {paused && (
                            <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                                <span>Too many attempts. Try again in {formatCountdown(lockoutSeconds)}.</span>
                            </div>
                        )}

                        {error && !paused && (
                            <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-destructive animate-ping shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>

            {/* Quick Demo Assist Banner */}
            <div className="p-2 sm:p-3 rounded-xl bg-muted/40 border border-border/50 text-center text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Tip: Scan RFID card or manually input card number for testing.</span>
            </div>
        </div>
    );
}
