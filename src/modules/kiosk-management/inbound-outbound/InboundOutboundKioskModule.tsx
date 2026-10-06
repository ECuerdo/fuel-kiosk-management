"use client";

import * as React from "react";
import { useInboundOutboundKiosk } from "./hooks/useInboundOutboundKiosk";
import { KioskSearch } from "./components/KioskSearch";
import { KioskList } from "./components/KioskList";
import { RefreshCcw, ArrowLeft, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function InboundOutboundKioskModule() {
    const {
        filteredPlans,
        loading,
        error,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        reload,
    } = useInboundOutboundKiosk();
    const router = useRouter();
    const [isServerDown, setIsServerDown] = React.useState(false);
    const [countdown, setCountdown] = React.useState(10);

    // Sync isServerDown with error from hook
    React.useEffect(() => {
        if (error) {
            setIsServerDown(true);
        } else {
            setIsServerDown(false);
            setCountdown(10);
        }
    }, [error]);

    const handleBack = async () => {
        try {
            await fetch("/api/kiosk-management/inbound-outbound/logout", { method: "POST" });
            router.push("/kiosk-management");
        } catch {
            toast.error("Failed to securely log out. Please try again.");
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    // Auto-refresh logic for Server Down state
    React.useEffect(() => {
        if (!isServerDown) return;

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    void handleRefresh();
                    return 10;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isServerDown]);

    return (
        <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20 px-4 md:px-8 lg:px-12">
            {/* Server Down Modal */}
            {isServerDown && (
                <div id="server-down-overlay" className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl p-4 md:p-8 animate-in zoom-in-95 duration-300">
                    <div className="max-w-md w-full p-8 rounded-[2.5rem] bg-card border border-destructive/20 shadow-[0_0_50px_-12px_rgba(220,38,38,0.3)] text-center space-y-8 relative overflow-hidden group">
                        {/* Background Pulse */}
                        <div className="absolute inset-0 bg-destructive/5 animate-pulse" />

                        <div className="relative space-y-6">
                            <div className="flex justify-center">
                                <div className="h-24 w-24 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center relative overflow-hidden">
                                    <WifiOff className="h-12 w-12 text-destructive" />
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-destructive/20 overflow-hidden">
                                        <div
                                            className="h-full bg-destructive transition-all duration-1000 ease-linear"
                                            style={{ width: `${(countdown / 10) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-balance">
                                <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic leading-none">
                                    Server Is Down
                                </h1>
                                <p className="text-muted-foreground font-bold tracking-tight uppercase text-xs">
                                    Please Contact Server Admin
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-muted/50 border border-border/40">
                                <p className="text-sm font-black tracking-widest uppercase text-primary animate-pulse">
                                    Auto refresh in {countdown}s
                                </p>
                            </div>

                            <Button
                                onClick={handleRefresh}
                                size="lg"
                                className="w-full rounded-2xl h-14 text-lg font-black tracking-tighter uppercase shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <RefreshCw className="mr-2 h-5 w-5" />
                                Force Retry Now
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Header Container */}
            <div className="relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                {loading && <RefreshCcw className="h-4 w-4 animate-spin text-muted-foreground/60" />}
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">
                                Kiosk Dispatch
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Real-time monitoring and management of inbound & outbound dispatch flows.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-card border border-border/60 shadow-sm rounded-xl px-4 py-4 w-24 transition-all hover:shadow-md hover:border-primary/30 group">
                        <span className="text-4xl font-black tracking-tighter text-primary transition-transform group-hover:scale-110 duration-300">
                            {filteredPlans.length}
                        </span>
                        <div className="flex flex-col items-center leading-none mt-1 opacity-60">
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Active</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Plans</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <KioskSearch
                    search={search}
                    onSearchChange={setSearch}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                />

                <div className="min-h-[500px]">
                    <KioskList plans={filteredPlans} loading={loading} onSuccess={reload} />
                </div>
            </div>
            {/* Fixed Floating Back Button */}
            <div className="fixed bottom-10 right-10 z-[60]">
                <Button
                    onClick={handleBack}
                    className="h-24 w-24 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all bg-primary hover:bg-primary/90 text-primary-foreground flex flex-col items-center justify-center gap-0 group border-4 border-background"
                >
                    <ArrowLeft className="h-10 w-10 transition-transform group-hover:-translate-x-1" strokeWidth={3} />
                    <span className="text-[10px] font-black tracking-widest uppercase mt-[-2px]">Back</span>
                </Button>
            </div>
        </div >
    );
}
