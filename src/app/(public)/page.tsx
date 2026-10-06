"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScanLine, Activity, Loader2 } from "lucide-react";

export default function PublicKioskLoginPage() {
    const router = useRouter();
    const [rfidValue, setRfidValue] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Kiosk Lockdown: Disable right-click and maintain focus
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        const focusInput = () => {
            if (!loading && inputRef.current) {
                inputRef.current.focus();
            }
        };

        focusInput();
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("click", focusInput);

        const intervalId = setInterval(focusInput, 2000);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("click", focusInput);
        };
    }, [loading]);

    const handleRfidScan = async (code: string) => {
        if (!code.trim() || loading) return;

        setLoading(true);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const res = await fetch("/api/auth/kiosk-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rfidCode: code.trim() }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const data = await res.json() as { success: boolean; message?: string; user?: { firstName: string; lastName: string } };

            if (res.ok && data.success) {
                toast.success(`Welcome, ${data.user?.firstName || 'User'}!`, {
                    description: "Authorization successful. Redirecting...",
                    duration: 3000,
                });

                router.push("/fuel-kiosk-management");
                router.refresh();
            } else {
                toast.error("Access Denied", {
                    description: data.message ?? "Invalid RFID or unauthorized department.",
                    duration: 5000,
                });
                setRfidValue("");
                setLoading(false);
            }
        } catch {
            toast.error("Server is down please contact Administrator", {
                duration: 5000,
            });
            setRfidValue("");
            setLoading(false);
        }
    };

    return (
        <div
            onContextMenu={(e) => e.preventDefault()}
            className="flex h-screen max-h-screen w-full flex-col items-center justify-center bg-[#020617] p-2 text-slate-50 relative overflow-hidden select-none"
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                .bg-mesh {
                    background: radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
                                radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), 
                                radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%);
                    background-size: 200% 200%;
                }
                .scanline-overlay {
                    background: repeating-linear-gradient(
                        0deg,
                        rgba(0, 0, 0, 0.1),
                        rgba(0, 0, 0, 0.1) 1px,
                        transparent 1px,
                        transparent 2px
                    );
                }
            `}} />

            {/* Background layers */}
            <div className="absolute inset-0 z-0 bg-mesh opacity-50 shrink-0" />
            <div className="absolute inset-0 z-0 scanline-overlay pointer-events-none opacity-20" />

            {/* Main Terminal UI Container tailored for 672x576 landscape display */}
            <div className="z-10 w-full max-w-sm relative flex flex-col items-center justify-center my-auto">
                <div className="text-center space-y-0.5 mb-2">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.6)] uppercase italic leading-none">
                        KIOSK TERMINAL
                    </h1>
                    <div className="text-[9px] text-blue-300/40 font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2">
                        <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-blue-500/40" />
                        Security Protocol Alpha-9
                        <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-blue-500/40" />
                    </div>
                </div>

                <Card className="w-full border-0 bg-white/[0.03] shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 overflow-hidden relative rounded-2xl">
                    <CardHeader className="flex flex-col items-center gap-1 pt-3 pb-2 px-4 relative z-10">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-all duration-300 ${loading
                            ? "bg-amber-500/20 text-amber-400 ring-amber-500/40"
                            : "bg-blue-500/10 text-blue-300 ring-blue-500/30"
                            }`}>
                            {loading
                                ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.5} />
                                : <ScanLine className="h-6 w-6 opacity-90" strokeWidth={1.5} />
                            }
                        </div>
                        <CardTitle className="text-sm font-black text-center text-white uppercase italic tracking-wide">
                            {loading ? "Verifying..." : "RFID Scan"}
                        </CardTitle>
                        <CardDescription className="text-center text-[10px] font-bold text-blue-200/40 uppercase tracking-widest">
                            {loading ? "Verifying credentials" : "Awaiting RFID Interface"}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col items-center gap-2 px-4 pb-4 w-full relative z-10">
                        <div className="relative w-full group/input">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-20">
                                <span className="flex h-2.5 w-2.5 relative">
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 animate-pulse" />
                                </span>
                            </div>

                            <Input
                                ref={inputRef}
                                type="password"
                                value={rfidValue}
                                onChange={(e) => setRfidValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        void handleRfidScan(rfidValue);
                                    }
                                }}
                                placeholder="[ INPUT REQUIRED ]"
                                disabled={loading}
                                autoComplete="off"
                                className="pl-9 text-center h-10 bg-black/60 hover:bg-black/70 border-white/10 border border-dashed font-mono text-xs sm:text-sm rounded-xl focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-400 text-blue-100 placeholder:text-blue-900/50 tracking-widest"
                            />
                        </div>

                        <div className={`flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase ${loading ? "text-amber-400" : "text-blue-400/60"}`}>
                            <Activity className="h-3 w-3" />
                            {loading ? "Decrypting..." : "Hardware Interface Online"}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-between items-center mt-2 w-full px-1">
                    <p className="text-[8px] font-black text-blue-500/30 uppercase tracking-widest">
                        VOS-WEB Kiosk // Core v1.0
                    </p>
                    <p className="text-[8px] font-black text-blue-500/30 uppercase tracking-widest">
                        {new Date().getFullYear()} © Men2 Marketing
                    </p>
                </div>
            </div>
        </div>
    );
}
