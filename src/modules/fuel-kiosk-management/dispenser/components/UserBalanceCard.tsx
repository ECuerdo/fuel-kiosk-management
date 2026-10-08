"use client";

import React from "react";
import { UserFuelBalance } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, FileText, Droplet, Gauge, CheckCircle2, CreditCard } from "lucide-react";
import { formatLiters } from "../utils";

interface UserBalanceCardProps {
    userBalance: UserFuelBalance;
}

export function UserBalanceCard({ userBalance }: UserBalanceCardProps) {
    const remaining = userBalance.remainingLiters;
    const allocated = userBalance.allocatedLiters;
    const used = userBalance.usedLiters;
    const usagePercent = Math.min(100, Math.max(0, (used / (allocated || 1)) * 100));

    return (
        <Card className="h-full flex flex-col overflow-hidden border border-border/60 shadow-lg rounded-2xl bg-card/90 backdrop-blur-xl relative">
            <CardContent className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col justify-between gap-3 overflow-hidden">
                {/* Header User info */}
                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm shadow-sm shrink-0">
                            <User className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-foreground truncate max-w-[150px] sm:max-w-none" title={`${userBalance.firstName} ${userBalance.lastName}`}>
                                    {userBalance.firstName} {userBalance.lastName}
                                </h3>
                                <Badge variant="secondary" className="font-bold text-[8px] sm:text-[9px] uppercase px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0">
                                    {userBalance.position}
                                </Badge>
                            </div>
                            <p className="text-[9px] sm:text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                                <FileText className="h-2.5 w-2.5 text-primary shrink-0" />
                                <span className="truncate">Doc: <strong className="text-foreground">{userBalance.allocationDocNo ?? "None"}</strong></span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] sm:text-xs shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Verified</span>
                    </div>
                </div>

                {/* Horizontal Stat Boxes Stacked Vertically */}
                <div className="flex-1 flex flex-col gap-2.5 justify-center min-h-0">
                    {/* Available Balance Box (Horizontal) */}
                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-2 border-emerald-500/30 flex flex-col justify-between shadow-sm flex-1">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                <span>Available Balance</span>
                            </span>
                            <Badge className="bg-emerald-500 text-white font-bold text-[8px] sm:text-[9px] uppercase px-1.5 py-0.5 shrink-0">
                                Active Limit
                            </Badge>
                        </div>
                        <div className="flex items-baseline justify-between mt-2">
                            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight leading-none">
                                {formatLiters(remaining)} <span className="text-xs sm:text-sm font-bold">L</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                                Ready to dispense
                            </p>
                        </div>
                    </div>

                    {/* Already Dispensed Box (Horizontal) */}
                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/50 flex flex-col justify-between shadow-sm flex-1">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Droplet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
                                <span>Already Dispensed</span>
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1">
                                <CreditCard className="h-3 w-3 text-primary shrink-0" />
                                <span>RFID: {userBalance.rfid || "Scanned"}</span>
                            </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-2">
                            <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-foreground leading-none">
                                {formatLiters(used)} <span className="text-xs sm:text-sm font-bold text-muted-foreground">L</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                                Used in period
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-0.5">
                    <div className="flex justify-between text-[9px] sm:text-xs font-bold text-muted-foreground">
                        <span>Fuel Quota Usage</span>
                        <span>{usagePercent.toFixed(0)}% Used</span>
                    </div>
                    <div className="h-2 sm:h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/40">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, usagePercent))}%` }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
