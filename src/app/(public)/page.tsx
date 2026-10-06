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

                router.push("/kiosk-management");
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
            className="flex min-h-screen w-full flex-col items-center justify-center bg-[#020617] p-8 text-slate-50 relative overflow-hidden select-none"
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

            {/* Layer 1: Base Mesh Gradient */}
            <div className="absolute inset-0 z-0 bg-mesh opacity-50 shrink-0" />

            {/* Layer 2: Cyber Scanlines */}
            <div className="absolute inset-0 z-0 scanline-overlay pointer-events-none opacity-20" />

            {/* Layer 4: Static Blobs */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[40vw] bg-indigo-500/05 rounded-full blur-[100px]" />
            </div>

            {/* Layer 5: Depth Overlays */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(2,6,23,0)_0%,rgba(2,6,23,0.9)_100%)] pointer-events-none" />
            <div className="absolute inset-0 z-0 backdrop-blur-[2px] pointer-events-none" />

            {/* Main Terminal UI Container */}
            <div className="z-10 w-full max-w-lg relative">
                <div className="flex flex-col items-center justify-center mb-12 gap-5 relative">

                    <div className="text-center space-y-3">
                        <h1 className="text-6xl font-black tracking-[-0.05em] text-white mt-4 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)] uppercase italic">
                            KIOSK TERMINAL
                        </h1>
                        <div className="text-sm text-blue-300/40 font-black tracking-[0.4em] uppercase flex items-center justify-center gap-4">
                            <span className="h-[2px] w-12 bg-gradient-to-r from-transparent to-blue-500/40" />
                            Security Protocol Alpha-9
                            <span className="h-[2px] w-12 bg-gradient-to-l from-transparent to-blue-500/40" />
                        </div>
                    </div>
                </div>

                <Card className="border-0 bg-white/[0.02] shadow-[0_0_120px_rgba(0,0,0,0.8)] backdrop-blur-[60px] ring-1 ring-white/10 overflow-hidden relative rounded-[3rem] group/card">
                    {/* Interior Static Stripe */}
                    <div className="absolute top-0 bottom-0 w-[150px] bg-white/[0.03] -skew-x-12 pointer-events-none left-[20%]" />

                    <CardHeader className="flex flex-col items-center gap-2 pt-12 pb-8 relative z-10">
                        <div className={`flex h-28 w-28 shrink-0 items-center justify-center rounded-[2.5rem] shadow-inner mb-6 ring-2 transition-all duration-500 ${loading
                            ? "bg-amber-500/20 text-amber-400 ring-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.3)]"
                            : "bg-blue-500/10 text-blue-300 ring-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.2)]"
                            }`}>
                            {loading
                                ? <Loader2 className="h-14 w-14 animate-spin" strokeWidth={1.5} />
                                : <ScanLine className="h-14 w-14 opacity-90" strokeWidth={1.5} />
                            }
                        </div>
                        <CardTitle className="text-3xl font-black tracking-[-0.03em] text-center px-4 text-white uppercase italic">
                            {loading ? "Verifying..." : "RFID Scan"}
                        </CardTitle>
                        <CardDescription className="text-center text-base font-bold px-10 text-blue-200/40 uppercase tracking-[0.2em] mt-1">
                            {loading
                                ? "Verifying authorized credentials"
                                : "Awaiting RFID Hardware Interface"
                            }
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col items-center gap-8 px-12 pb-16 w-full relative z-10">
                        {/* RFID Input Area */}
                        <div className="relative w-full max-w-[340px] group/input">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover/input:opacity-40 transition duration-500" />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none z-20">
                                <span className="flex h-4 w-4 relative">
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500" />
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
                                className="pl-16 text-center h-20 bg-black/60 hover:bg-black/70 border-white/10 border-2 border-dashed font-mono text-2xl rounded-2xl focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-400 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] transition-all duration-500 disabled:opacity-50 text-blue-100 placeholder:text-blue-900/50 tracking-[0.2em]"
                            />
                        </div>

                        <div className={`flex items-center gap-3 text-xs font-black tracking-[0.3em] uppercase transition-colors duration-500 ${loading ? "text-amber-400" : "text-blue-400/60"
                            }`}>
                            <Activity className="h-4 w-4" />
                            {loading ? "Decrypting..." : "Hardware Interface Online"}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-between items-center mt-10 px-4">
                    <p className="text-[10px] font-black text-blue-500/30 uppercase tracking-[0.5em]">
                        VOS-WEB Kiosk // Core v1.0
                    </p>
                    <p className="text-[10px] font-black text-blue-500/30 uppercase tracking-[0.5em]">
                        {new Date().getFullYear()} © Men2 Marketing
                    </p>
                </div>
            </div>
        </div>
    );
}
