"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import {
    Search,
    Loader2,
    Phone,
    MapPin,
    CircleDashed,
    RefreshCw,
    CheckCheck,
    Copy,
    Check,
} from "lucide-react";
import { toast } from "sonner";

interface Delivery {
    id: string;
    user: {
        name: string;
        phone: string;
        alternatePhone?: string | null;
        area: string;
        address: string;
        landmark: string;
    };
    tiffinCount: number;
    isCancelled: boolean;
    isDelivered: boolean;
    deliveredAt: string | null;
}

export function VolunteerDeliveryPanel() {
    const { token } = useAuth();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "DELIVERED">("PENDING");
    const [displayLabel, setDisplayLabel] = useState("");

    // Persistent scroll observer
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        fetchDeliveries(true);
    }, [token, statusFilter]);

    const fetchDeliveries = async (isInitial = false) => {
        if (isInitial) {
            setIsLoading(true);
            setNextCursor(null);
        } else {
            setIsMoreLoading(true);
        }

        try {
            const params = new URLSearchParams();
            if (query) params.append("query", query);
            if (statusFilter !== "ALL") params.append("status", statusFilter);
            if (!isInitial && nextCursor) params.append("cursor", nextCursor);
            params.append("limit", "20");

            const res = await fetch(`/api/volunteer/deliveries?${params}`);

            if (res.ok) {
                const data = await res.json();
                if (isInitial) {
                    setDeliveries(data.deliveries);
                    setDisplayLabel(data.displayLabel);
                } else {
                    setDeliveries(prev => [...prev, ...data.deliveries]);
                }
                setNextCursor(data.nextCursor);
            }
        } catch (error) {
            console.error("Fetch deliveries error:", error);
            toast.error("Failed to load deliveries");
        } finally {
            setIsLoading(false);
            setIsMoreLoading(false);
        }
    };

    const handleMarkDelivered = async (bookingId: string) => {
        // Guard: prevent double-delivering the same booking
        const existing = deliveries.find(d => d.id === bookingId);
        if (existing?.isDelivered) {
            toast.error("Already marked as delivered");
            return;
        }

        // Optimistic UI update
        const previousDeliveries = [...deliveries];
        setDeliveries(prev => prev.map(d =>
            d.id === bookingId ? { ...d, isDelivered: true, deliveredAt: new Date().toISOString() } : d
        ));

        try {
            const res = await fetch("/api/volunteer/deliveries", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ bookingId })
            });

            if (!res.ok) {
                setDeliveries(previousDeliveries);
                const err = await res.json();
                toast.error(err.error || "Failed to update");
            } else {
                if (statusFilter === "PENDING") {
                    // Smooth exit animation feel
                    setTimeout(() => {
                        setDeliveries(prev => prev.filter(d => d.id !== bookingId));
                    }, 300);
                }
            }
        } catch (error) {
            setDeliveries(previousDeliveries);
            toast.error("An error occurred");
        }
    };

    const handleUndoDelivery = async (bookingId: string) => {
        const previousDeliveries = [...deliveries];
        setDeliveries(prev => prev.map(d =>
            d.id === bookingId ? { ...d, isDelivered: false, deliveredAt: null } : d
        ));

        try {
            const res = await fetch(`/api/volunteer/deliveries?bookingId=${bookingId}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                setDeliveries(previousDeliveries);
                const err = await res.json();
                toast.error(err.error || "Failed to undo");
            } else {
                if (statusFilter === "DELIVERED") {
                    setTimeout(() => {
                        setDeliveries(prev => prev.filter(d => d.id !== bookingId));
                    }, 300);
                }
                toast.success("Delivery undone");
            }
        } catch (error) {
            setDeliveries(previousDeliveries);
            toast.error("An error occurred");
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchDeliveries(true);
    };

    return (
        <div className="space-y-4">
            {/* Delivery Day Header */}
            <div className="flex items-center justify-between px-2">
                <div>
                    <h2 className="text-xl font-black">{displayLabel || "Loading..."}</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        {deliveries.filter(d => !d.isDelivered).length} Pending • {deliveries.filter(d => d.isDelivered).length} Done
                    </p>
                </div>
                <button
                    onClick={() => fetchDeliveries(true)}
                    className="p-2.5 rounded-2xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95"
                >
                    <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3">
                <form onSubmit={handleSearch} className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search name or address..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-zinc-900 transition-all placeholder:text-zinc-700"
                    />
                </form>

                <div className="flex gap-1.5 p-1.5 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                    {(["PENDING", "DELIVERED", "ALL"] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === s
                                ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                                : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-emerald-500 animate-spin" />
                    </div>
                    <p className="text-zinc-600 font-bold text-xs uppercase tracking-widest">Loading Tasks...</p>
                </div>
            ) : deliveries.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/30 rounded-[2.5rem] border border-dashed border-zinc-800/50">
                    <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                        <CircleDashed className="h-8 w-8 text-zinc-700" />
                    </div>
                    <p className="text-zinc-400 font-black uppercase tracking-tight">All caught up!</p>
                    <p className="text-[10px] text-zinc-600 mt-1 uppercase font-bold">No {statusFilter.toLowerCase()} deliveries</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {deliveries.map((delivery) => (
                        <DeliveryCard
                            key={delivery.id}
                            delivery={delivery}
                            onMarkDelivered={handleMarkDelivered}
                            onUndoDelivery={handleUndoDelivery}
                        />
                    ))}

                    {/* Infinite Scroll Load Trigger */}
                    {nextCursor && (
                        <div
                            className="h-24 flex items-center justify-center"
                            ref={(el) => {
                                if (el) {
                                    if (observerRef.current) observerRef.current.disconnect();
                                    observerRef.current = new IntersectionObserver((entries) => {
                                        if (entries[0].isIntersecting && !isMoreLoading) {
                                            fetchDeliveries();
                                        }
                                    }, { threshold: 0.1 });
                                    observerRef.current.observe(el);
                                }
                            }}
                        >
                            {isMoreLoading && <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DeliveryCard({
    delivery,
    onMarkDelivered,
    onUndoDelivery
}: {
    delivery: Delivery;
    onMarkDelivered: (id: string) => void;
    onUndoDelivery: (id: string) => void;
}) {
    const [isUpdating, setIsUpdating] = useState(false);

    const toggleStatus = async () => {
        if (isUpdating || delivery.isCancelled) return;
        setIsUpdating(true);
        if (delivery.isDelivered) {
            await onUndoDelivery(delivery.id);
        } else {
            await onMarkDelivered(delivery.id);
        }
        setIsUpdating(false);
    };

    return (
        <div className={`group relative p-4 rounded-[2rem] border transition-all duration-300 ${delivery.isDelivered
            ? "bg-zinc-900/40 border-zinc-800/50"
            : "bg-zinc-900/80 border-zinc-800 shadow-xl shadow-black/20"
            }`}>

            <div className="flex gap-4">
                {/* Status Toggle Area (Clickable side) */}
                <button
                    onClick={toggleStatus}
                    disabled={isUpdating}
                    className="relative shrink-0"
                >
                    <div className={`w-14 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all overflow-hidden ${delivery.isDelivered
                        ? "bg-emerald-500 text-black"
                        : "bg-zinc-800 text-zinc-500 active:scale-95 active:bg-zinc-700"
                        }`}>
                        {isUpdating ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : delivery.isDelivered ? (
                            <>
                                <CheckCheck className="h-7 w-7" />
                                <span className="text-[10px] font-black uppercase [writing-mode:vertical-rl] [text-orientation:mixed] rotate-180">Done</span>
                            </>
                        ) : (
                            <>
                                <div className="w-6 h-6 rounded-full border-2 border-zinc-700 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-zinc-700" />
                                </div>
                                <span className="text-[10px] font-black uppercase [writing-mode:vertical-rl] [text-orientation:mixed] rotate-180">Sehri</span>
                            </>
                        )}
                    </div>
                </button>

                {/* Content Area */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                        <div className="flex items-start justify-between mb-1">
                            <h3 className={`font-black text-lg truncate ${delivery.isDelivered ? "text-zinc-500 line-through" : "text-white"}`}>
                                {delivery.user.name}
                            </h3>
                            <div className="flex items-baseline gap-1 bg-zinc-950 px-3 py-1 rounded-xl border border-zinc-800 whitespace-nowrap">
                                <span className="text-lg font-black text-white">{delivery.tiffinCount}</span>
                                <span className="text-[9px] font-black uppercase text-zinc-500">Box</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 mb-2">
                            <MapPin className="h-3 w-3 text-emerald-500/50" />
                            <p className="text-[11px] text-zinc-500 font-bold uppercase truncate tracking-tight">{delivery.user.area}</p>
                        </div>

                        <p className={`text-xs leading-tight mb-2 line-clamp-2 break-words ${delivery.isDelivered ? "text-zinc-600" : "text-zinc-400 font-medium"}`}>
                            {delivery.user.address}
                        </p>
                    </div>

                    {/* Quick Action Bar */}
                    <div className="space-y-2">
                        <div className="flex items-stretch gap-2">
                            <div className="flex-1 flex gap-1.5 min-w-0">
                                <a
                                    href={`tel:${delivery.user.phone}`}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-zinc-900 transition-colors min-w-0"
                                >
                                    <Phone className="h-3 w-3 text-emerald-500 shrink-0" /> <span className="truncate">Call</span>
                                </a>
                                <CopyButton value={delivery.user.phone} />
                            </div>

                            <div className="flex-1">
                                {delivery.isDelivered ? (
                                    <button
                                        onClick={toggleStatus}
                                        disabled={isUpdating}
                                        className="w-full h-full flex items-center justify-center py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-red-500/20 transition-colors"
                                    >
                                        {isUpdating ? "..." : "Undo"}
                                    </button>
                                ) : (
                                    <div className="h-full flex items-center justify-center px-1">
                                        <p className="text-[9px] text-zinc-600 font-black uppercase italic tracking-tighter text-center leading-tight">
                                            Tap box to finish
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {delivery.user.alternatePhone && (
                            <div className="flex items-stretch gap-2 animate-in fade-in slide-in-from-top-1">
                                <div className="flex-1 flex gap-1.5 min-w-0">
                                    <a
                                        href={`tel:${delivery.user.alternatePhone}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-950/40 border border-zinc-800/50 text-zinc-500 rounded-xl font-bold text-[9px] uppercase tracking-wider hover:bg-zinc-900 transition-colors min-w-0"
                                    >
                                        <Phone className="h-2.5 w-2.5 text-zinc-600 shrink-0" /> <span className="truncate">Alt: {delivery.user.alternatePhone}</span>
                                    </a>
                                    <CopyButton value={delivery.user.alternatePhone} />
                                </div>
                                <div className="flex-1" /> {/* Spacer to align with the column above */}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="px-3 flex items-center justify-center bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-900 transition-colors"
            title="Copy to clipboard"
        >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}
