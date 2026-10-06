"use client";

import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Fuel, FileText, User, Gauge, ArrowRight } from "lucide-react";
import { formatLiters, formatDateTime } from "../utils";

interface DispenserReceiptModalProps {
    open: boolean;
    data: {
        dispensedLiters: number;
        docNo: string;
        userName: string;
        remainingLiters: number;
    } | null;
    onClose: () => void;
}

export function DispenserReceiptModal({
    open,
    data,
    onClose,
}: DispenserReceiptModalProps) {
    const [countdown, setCountdown] = useState<number>(10);

    useEffect(() => {
        if (!open) {
            setCountdown(10);
            return;
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    onClose();
                    return 10;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [open, onClose]);

    if (!data) return null;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-md rounded-3xl p-8 border-2 border-emerald-500/30 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)] bg-card space-y-6">
                <DialogHeader className="text-center space-y-3">
                    <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-inner">
                        <CheckCircle2 className="h-10 w-10 animate-in zoom-in duration-300" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tight text-foreground">
                        Fuel Dispensed Successfully!
                    </DialogTitle>
                    <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Transaction recorded to fuel usage log
                    </DialogDescription>
                </DialogHeader>

                {/* Receipt Details Box */}
                <div className="space-y-3 p-5 rounded-2xl bg-muted/40 border border-border/50 text-sm font-medium">
                    <div className="flex justify-between items-center pb-2 border-b border-border/40">
                        <span className="text-xs text-muted-foreground font-bold uppercase flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-primary" />
                            Driver Name
                        </span>
                        <strong className="text-foreground font-bold">{data.userName}</strong>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-border/40">
                        <span className="text-xs text-muted-foreground font-bold uppercase flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Doc No
                        </span>
                        <strong className="text-foreground font-mono text-xs">{data.docNo}</strong>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-border/40">
                        <span className="text-xs text-muted-foreground font-bold uppercase flex items-center gap-1.5">
                            <Fuel className="h-3.5 w-3.5 text-emerald-500" />
                            Dispensed Amount
                        </span>
                        <strong className="text-emerald-500 font-mono font-black text-lg">
                            {formatLiters(data.dispensedLiters)} L
                        </strong>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                        <span className="text-xs text-muted-foreground font-bold uppercase flex items-center gap-1.5">
                            <Gauge className="h-3.5 w-3.5 text-amber-500" />
                            New Remaining Balance
                        </span>
                        <strong className="text-foreground font-mono font-bold">
                            {formatLiters(data.remainingLiters)} L
                        </strong>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-col gap-3">
                    <Button
                        type="button"
                        onClick={onClose}
                        className="w-full h-12 text-base font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-2 shadow-lg"
                    >
                        Done / Next Driver ({countdown}s)
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
