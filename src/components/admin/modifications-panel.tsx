"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    AlertTriangle,
    Calendar,
    Edit3,
    RefreshCw,
    User,
    MapPin,
    Phone,
    Clock
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

interface Modification {
    id: string;
    date: string;
    tiffinCount: number | null;
    cancelled: boolean;
    reason: string | null;
    createdAt: string;
    booking: {
        user: {
            name: string;
            phone: string;
            area: string;
        };
        tiffinCount: number;
    };
}

export function AdminModificationsPanel() {
    const [modifications, setModifications] = useState<Modification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "today" | "cancelled">("today");

    useEffect(() => {
        fetchModifications();
    }, []);

    const fetchModifications = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/admin/modifications");
            if (response.ok) {
                const data = await response.json();
                setModifications(data.modifications || []);
            }
        } catch (error) {
            console.error("Failed to fetch modifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getFilteredModifications = () => {
        const today = new Date().toISOString().split("T")[0];

        switch (filter) {
            case "today":
                return modifications.filter(m => m.date.split("T")[0] === today);
            case "cancelled":
                return modifications.filter(m => m.cancelled);
            default:
                return modifications;
        }
    };

    const filteredMods = getFilteredModifications();

    return (
        <Card className="glass border-white/5 rounded-3xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-400" />
                            Booking Modifications
                        </CardTitle>
                        <CardDescription className="text-[10px] leading-tight mb-2">
                            Real-time changes made by users to their deliveries. These overrides take priority over their base plan.
                        </CardDescription>
                        <div className="flex gap-4 mb-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold">
                                <Edit3 className="h-3 w-3" /> MODIFIED: Shift in tiffins
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold">
                                <AlertTriangle className="h-3 w-3" /> CANCELLED: No delivery today
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={fetchModifications}
                        disabled={isLoading}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mt-4">
                    {[
                        { key: "today", label: "Today" },
                        { key: "cancelled", label: "Cancelled" },
                        { key: "all", label: "All Changes" }
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key as typeof filter)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === key
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-white/5 hover:bg-white/10"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Loading modifications...
                    </div>
                ) : filteredMods.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-muted-foreground mb-2">No modifications found</div>
                        <p className="text-xs text-muted-foreground/50">
                            {filter === "today"
                                ? "No changes made for today's deliveries"
                                : "Users haven't made any changes yet"
                            }
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMods.map((mod) => (
                            <div
                                key={mod.id}
                                className={`p-4 rounded-xl border transition-colors ${mod.cancelled
                                    ? "bg-red-500/5 border-red-500/20"
                                    : "bg-amber-500/5 border-amber-500/20"
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${mod.cancelled ? "bg-red-500/20" : "bg-amber-500/20"
                                            }`}>
                                            {mod.cancelled ? (
                                                <AlertTriangle className="h-4 w-4 text-red-400" />
                                            ) : (
                                                <Edit3 className="h-4 w-4 text-amber-400" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-bold">{mod.booking.user.name}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="flex items-start gap-1 text-xs text-muted-foreground">
                                                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                                                    <span className="break-all">{mod.booking.user.area}</span>
                                                </div>
                                                <div className="flex items-start gap-1 text-xs text-muted-foreground">
                                                    <Phone className="h-3 w-3 shrink-0 mt-0.5" />
                                                    <span className="break-all">{mod.booking.user.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={mod.cancelled ? "destructive" : "outline"}
                                        className={mod.cancelled
                                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                        }
                                    >
                                        {mod.cancelled ? "Cancelled" : "Modified"}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{formatDate(mod.date)}</span>
                                    </div>

                                    {!mod.cancelled && mod.tiffinCount !== null && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Tiffins:</span>
                                            <span className="text-muted-foreground line-through">
                                                {mod.booking.tiffinCount}
                                            </span>
                                            <span className="text-amber-400 font-bold">
                                                → {mod.tiffinCount}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {mod.reason && (
                                    <div className="mt-2 text-xs text-muted-foreground italic">
                                        "{mod.reason}"
                                    </div>
                                )}

                                <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/50">
                                    <Clock className="h-3 w-3" />
                                    Changed at {formatTime(mod.createdAt)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
