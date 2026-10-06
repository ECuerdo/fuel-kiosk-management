"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    ArrowLeftRight,
    BellRing,
    Users,
    Building2,
    UtensilsCrossed,
    Factory,
    Activity,
    ScanLine,
    Loader2,
    CirclePower,
    type LucideIcon,
    DollarSign,
} from "lucide-react";
import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ─────────────────────────────────────────────
 * CVA — Kiosk Card Variants (Base only)
 * ───────────────────────────────────────────── */
const kioskCardVariants = cva(
    [
        "group/card relative flex aspect-square cursor-pointer flex-col items-center justify-center",
        "overflow-hidden rounded-3xl border-0 py-0 shadow-lg text-white",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-2xl",
        "active:scale-[0.97] active:shadow-md",
        "select-none",
    ].join(" ")
);

/* ─────────────────────────────────────────────
 * Feature Data
 * ───────────────────────────────────────────── */
interface KioskFeature {
    title: string;
    description: string;
    icon: LucideIcon;
    bgClass: string;
    href: string;
    badge?: string;
    requiresAuth?: boolean;
}

const KIOSK_FEATURES: KioskFeature[] = [
    {
        title: "Inbound / Outbound",
        description: "Track deliveries & shipments",
        icon: ArrowLeftRight,
        bgClass: "bg-gradient-to-br from-blue-500 to-blue-700",
        href: "/kiosk-management/inbound-outbound",
        badge: "Logistics",
        requiresAuth: true,
    },
    {
        title: "Asset Alert",
        description: "Monitor asset notifications",
        icon: BellRing,
        bgClass: "bg-gradient-to-br from-rose-500 to-rose-700",
        href: "/kiosk-management/asset-alert",
        badge: "Alerts",
    },
    {
        title: "Men2 Attendance",
        description: "Employee time tracking",
        icon: Users,
        bgClass: "bg-gradient-to-br from-emerald-500 to-emerald-700",
        href: "/kiosk-management/men2-attendance",
        badge: "HR",
    },
    {
        title: "Vertex Attendance",
        description: "Vertex site attendance",
        icon: Building2,
        bgClass: "bg-gradient-to-br from-violet-500 to-violet-700",
        href: "/kiosk-management/vertex-attendance",
        badge: "HR",
    },
    /*
    {
        title: "Hanvin Attendance",
        description: "Hanvin site attendance",
        icon: History,
        bgClass: "bg-gradient-to-br from-orange-400 to-orange-600",
        href: "/kiosk-management/hanvin-attendance",
        badge: "HR",
    },
    */
    {
        title: "Cafeteria",
        description: "Meal & cafeteria access",
        icon: UtensilsCrossed,
        bgClass: "bg-gradient-to-br from-amber-400 to-amber-600",
        href: "/kiosk-management/cafeteria-attendance",
        badge: "Facility",
    },
    {
        title: "Production Attendance",
        description: "Production floor tracking",
        icon: Factory,
        bgClass: "bg-gradient-to-br from-cyan-500 to-cyan-700",
        href: "/kiosk-management/production-attendance",
        badge: "Operations",
    },
    {
        title: "RSM Attendance",
        description: "RSM site attendance",
        icon: DollarSign,
        bgClass: "bg-gradient-to-br from-purple-500 to-pink-700",
        href: "/kiosk-management/rsm-attendance",
        badge: "HR",
    },
    /*
    {
        title: "Vital Attendance",
        description: "Vital site attendance",
        icon: Building,
        bgClass: "bg-gradient-to-br from-pink-500 to-pink-700",
        href: "/kiosk-management/vital-attendance",
        badge: "HR",
    },
    */
    {
        title: "Menza Attendance",
        description: "Menza site attendance",
        icon: Building2,
        bgClass: "bg-gradient-to-br from-teal-500 to-teal-700",
        href: "/kiosk-management/menza-attendance",
        badge: "HR",
    },
];

/* ─────────────────────────────────────────────
 * RFID Dialog — only for Inbound/Outbound
 * ───────────────────────────────────────────── */
function RfidAuthDialog({
    feature,
    children,
}: {
    feature: KioskFeature;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [rfidValue, setRfidValue] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        setRfidValue("");
        setLoading(false);
        if (isOpen) {
            // Auto-focus the input so an RFID scanner (keyboard emulator) writes directly
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    };

    const handleRfidScan = async (code: string) => {
        if (!code.trim() || loading) return;

        setLoading(true);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const res = await fetch("/api/kiosk-management/validate-rfid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rfidCode: code.trim() }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const data = await res.json() as { authorized: boolean; message?: string };

            if (data.authorized) {
                setOpen(false);
                router.push(feature.href);
            } else {
                toast.error("Sorry, you are not authorized!", {
                    description: data.message ?? "Your RFID card does not have access to this module.",
                    duration: 4000,
                });
                setRfidValue("");
                setLoading(false);
                setTimeout(() => inputRef.current?.focus(), 100);
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
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <div className="w-full max-w-sm cursor-pointer outline-none">
                    {children}
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-3xl shadow-2xl overflow-hidden pt-8 pb-10 gap-6">
                {/* Top accent bar */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-primary" />

                <DialogHeader className="flex flex-col items-center gap-2 pt-2 pb-0">
                    <div className={cn(
                        "flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl shadow-inner mb-2 ring-1",
                        loading
                            ? "bg-amber-500/10 text-amber-500 ring-amber-500/20"
                            : "bg-primary/10 text-primary dark:bg-primary/20 ring-primary/20"
                    )}>
                        {loading
                            ? <Loader2 className="h-10 w-10 animate-spin" strokeWidth={2} />
                            : <ScanLine className="h-10 w-10 opacity-90" strokeWidth={2} />
                        }
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight text-center px-4">
                        {loading ? "Verifying..." : "Authorized Personnel Only"}
                    </DialogTitle>
                    <DialogDescription className="text-center text-sm font-medium px-4">
                        {loading
                            ? "Checking your RFID access card. Please wait."
                            : <>Please scan your RFID access card to open the <span className="font-bold text-foreground">{feature.title}</span> module.</>
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 px-4 w-full">
                    {/* RFID Input — scanner writes to this field then presses Enter */}
                    <div className="relative w-full max-w-[280px]">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                            </span>
                        </div>
                        <Input
                            ref={inputRef}
                            type="password"
                            value={rfidValue}
                            onChange={(e) => setRfidValue(e.target.value)}
                            onKeyDown={(e) => {
                                // RFID scanners typically send Enter after the code
                                if (e.key === "Enter") {
                                    void handleRfidScan(rfidValue);
                                }
                            }}
                            placeholder="Waiting for RFID scan..."
                            disabled={loading}
                            autoComplete="off"
                            className="pl-12 text-center h-14 bg-muted/60 hover:bg-muted/80 border-dashed border-2 font-mono text-lg rounded-xl focus-visible:ring-primary shadow-inner transition-colors duration-200 disabled:opacity-50"
                        />
                    </div>

                    <div className={cn(
                        "flex items-center gap-2 text-xs font-medium",
                        loading ? "text-amber-500" : "text-muted-foreground animate-pulse"
                    )}>
                        <Activity className="h-3.5 w-3.5" />
                        {loading ? "Verifying identity..." : "Scanner Active"}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ─────────────────────────────────────────────
 * Page Component
 * ───────────────────────────────────────────── */
export default function KioskManagementPage() {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleGlobalLogout = async () => {
        try {
            setIsLoggingOut(true);
            await fetch("/api/auth/kiosk-logout", { method: "POST" });
            router.push("/");
            toast.success("Logged out successfully");
        } catch {
            toast.error("Failed to log out properly.");
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 relative">

            {/* Global Logout Button */}
            <div className="absolute top-8 right-8 z-50">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-24 w-24 rounded-full bg-white/50 shadow-sm hover:bg-red-50 hover:text-red-600 text-red-500 dark:bg-black/50 dark:hover:bg-red-950 dark:hover:text-red-400 transition-all border border-border/50 group"
                        >
                            <CirclePower className="size-16 transition-transform group-hover:scale-110" strokeWidth={3} />
                            <span className="sr-only">Log Out</span>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="sm:max-w-md bg-background/95 backdrop-blur-3xl shadow-2xl border-red-500/20">
                        {/* Top decorative red bar */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-rose-600" />

                        <div className="flex flex-col items-center gap-4 text-center pt-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 ring-8 ring-red-50 dark:ring-red-950/50">
                                <CirclePower className="h-8 w-8 text-red-600 dark:text-red-500" strokeWidth={2.5} />
                            </div>

                            <AlertDialogHeader className="w-full">
                                <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                                    System Logout
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-base mt-2 text-muted-foreground">
                                    Are you sure you want to log out of the kiosk terminal? You will need an authorized RFID badge to regain access.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                        </div>

                        <AlertDialogFooter className="mt-6 flex gap-3 sm:space-x-0">
                            <AlertDialogCancel
                                disabled={isLoggingOut}
                                className="flex-1 rounded-xl h-12 font-semibold text-muted-foreground hover:bg-muted"
                            >
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    void handleGlobalLogout();
                                }}
                                disabled={isLoggingOut}
                                className="flex-1 rounded-xl h-12 bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm transition-colors"
                            >
                                {isLoggingOut ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Confirm Logout"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <div className="flex w-full max-w-6xl flex-col items-center gap-10">

                {/* Header */}
                <div className="flex flex-col items-center gap-3 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Kiosk Management
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Select a module to get started
                    </p>
                    <Separator className="mt-2 w-24 bg-primary/40" />
                </div>

                {/* Card Grid */}
                <div className="grid w-full grid-cols-2 gap-6 place-items-center max-w-4xl">
                    {KIOSK_FEATURES.map((feature) => {
                        const CardComponent = (
                            <Card className={cn(kioskCardVariants(), feature.bgClass, "text-white ring-1 ring-white/10")}>

                                {/* Glossy overlay */}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/20" />

                                {/* Decorative circles */}
                                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
                                <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-black/10" />

                                <CardHeader className="relative z-10 flex flex-col items-center gap-4 md:gap-6 px-4 pt-10 pb-0">
                                    <div className="flex h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 shrink-0 items-center justify-center rounded-2xl md:rounded-3xl bg-white/20 shadow-inner backdrop-blur-sm transition-transform duration-300 group-hover/card:scale-110 text-white">
                                        <feature.icon className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-white" strokeWidth={1.5} />
                                    </div>
                                    <CardTitle className="text-center text-xl md:text-2xl lg:text-3xl font-extrabold leading-tight tracking-wide text-white drop-shadow-md pb-1">
                                        {feature.title}
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="relative z-10 flex flex-1 w-full flex-col items-center justify-start gap-4 px-6 pb-8 mt-2 md:mt-4">
                                    <CardDescription className="text-center text-sm md:text-base font-medium leading-snug text-white/95 drop-shadow-sm min-h-[40px] md:min-h-[48px] flex items-center justify-center">
                                        {feature.description}
                                    </CardDescription>
                                    <div className="mt-auto">
                                        {feature.badge && (
                                            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none text-xs md:text-sm px-3 md:px-4 py-1">
                                                {feature.badge}
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );

                        if (feature.requiresAuth) {
                            return (
                                <RfidAuthDialog key={feature.title} feature={feature}>
                                    {CardComponent}
                                </RfidAuthDialog>
                            );
                        }

                        return (
                            <Link key={feature.title} href={feature.href} className="w-full max-w-sm">
                                {CardComponent}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
