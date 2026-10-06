"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Delete, RotateCcw, Fuel, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { formatLiters } from "../utils";

interface FuelNumpadProps {
    value: string;
    onChange: (value: string) => void;
    maxLiters: number;
    onSubmit: () => void;
    loading: boolean;
    onBack: () => void;
}

export function FuelNumpad({
    value,
    onChange,
    maxLiters,
    onSubmit,
    loading,
    onBack,
}: FuelNumpadProps) {
    const currentNum = parseFloat(value) || 0;
    const isExceeding = currentNum > maxLiters;
    const isValid = currentNum > 0 && !isExceeding;

    const handleKeyPress = (digit: string) => {
        if (loading) return;

        if (digit === ".") {
            if (value.includes(".")) return;
            if (value === "") {
                onChange("0.");
                return;
            }
        }

        if (value.includes(".")) {
            const parts = value.split(".");
            if (parts[1] && parts[1].length >= 2) return;
        }

        const newValue = value === "0" ? digit : value + digit;
        const nextNum = parseFloat(newValue) || 0;
        if (nextNum > 9999) return;

        onChange(newValue);
    };

    const handleBackspace = () => {
        if (loading || !value) return;
        onChange(value.slice(0, -1));
    };

    const handleClear = () => {
        if (loading) return;
        onChange("");
    };

    const handlePreset = (amount: number) => {
        if (loading) return;
        const targetAmount = Math.min(amount, maxLiters);
        onChange(targetAmount.toString());
    };

    const handleSetMax = () => {
        if (loading) return;
        onChange(maxLiters.toFixed(2));
    };

    return (
        <Card className="h-full flex flex-col justify-between border-2 border-primary/20 shadow-lg rounded-2xl bg-card/90 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-1.5 sm:space-y-2.5 overflow-hidden">
                {/* Header & Back Button */}
                <div className="flex items-center justify-between gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onBack}
                        disabled={loading}
                        className="gap-1 px-1.5 sm:px-2.5 h-6 sm:h-7 text-[10px] sm:text-xs font-bold text-muted-foreground hover:text-foreground rounded-lg"
                    >
                        <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span>Change RFID</span>
                    </Button>
                    <div className="text-right">
                        <span className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-wider inline-block mr-1">
                            Max Limit:
                        </span>
                        <span className="text-[11px] sm:text-xs font-black text-emerald-500 font-mono">
                            {formatLiters(maxLiters)} L
                        </span>
                    </div>
                </div>

                {/* Display Screen */}
                <div className={`p-2 sm:p-3 rounded-xl border-2 transition-all duration-300 relative ${
                    isExceeding
                        ? "bg-destructive/10 border-destructive shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                        : isValid
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "bg-muted/50 border-border"
                }`}>
                    <div className="flex justify-between items-center text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                        <span>Liters to Dispense</span>
                        {isExceeding && (
                            <span className="text-destructive font-black flex items-center gap-0.5 text-[8px] sm:text-[9px]">
                                <AlertTriangle className="h-3 w-3" />
                                Exceeds max ({formatLiters(maxLiters)}L)
                            </span>
                        )}
                    </div>

                    <div className="flex items-baseline justify-between">
                        <div className={`text-xl sm:text-3xl md:text-4xl font-black font-mono tracking-tight leading-none ${
                            isExceeding ? "text-destructive" : isValid ? "text-emerald-500" : "text-foreground"
                        }`}>
                            {value || "0.00"}
                        </div>
                        <div className="text-xs sm:text-base font-black text-muted-foreground font-sans">
                            LITERS
                        </div>
                    </div>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handlePreset(5)}
                        disabled={loading || maxLiters < 5}
                        className="h-7 sm:h-9 rounded-lg font-bold border hover:border-primary text-[10px] sm:text-xs px-1"
                    >
                        +5L
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handlePreset(10)}
                        disabled={loading || maxLiters < 10}
                        className="h-7 sm:h-9 rounded-lg font-bold border hover:border-primary text-[10px] sm:text-xs px-1"
                    >
                        +10L
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handlePreset(20)}
                        disabled={loading || maxLiters < 20}
                        className="h-7 sm:h-9 rounded-lg font-bold border hover:border-primary text-[10px] sm:text-xs px-1"
                    >
                        +20L
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleSetMax}
                        disabled={loading || maxLiters <= 0}
                        className="h-7 sm:h-9 rounded-lg font-black border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white text-[10px] sm:text-xs px-1"
                    >
                        MAX
                    </Button>
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((key) => (
                        <Button
                            key={key}
                            type="button"
                            variant="outline"
                            onClick={() => handleKeyPress(key)}
                            disabled={loading}
                            className="h-9 sm:h-12 text-base sm:text-xl font-black rounded-xl border hover:border-primary hover:bg-primary/10 transition-all duration-150 active:scale-95 shadow-sm"
                        >
                            {key}
                        </Button>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleBackspace}
                        disabled={loading || !value}
                        className="h-9 sm:h-12 text-sm sm:text-lg font-bold rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all duration-150 active:scale-95"
                    >
                        <Delete className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                    </Button>
                </div>

                {/* Bottom Action Controls */}
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 pt-0.5">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClear}
                        disabled={loading || !value}
                        className="h-9 sm:h-11 text-[10px] sm:text-xs font-bold rounded-xl border border-border hover:bg-destructive/10 hover:text-destructive gap-1 px-1.5"
                    >
                        <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                        Clear
                    </Button>
                    <Button
                        type="button"
                        onClick={onSubmit}
                        disabled={loading || !isValid}
                        className="col-span-2 h-9 sm:h-11 text-xs sm:text-base font-black uppercase tracking-wider rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md gap-1 sm:gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                Dispensing...
                            </>
                        ) : (
                            <>
                                <Fuel className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Dispense {value ? `${value} L` : ""}
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
