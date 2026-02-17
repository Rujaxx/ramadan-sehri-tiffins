"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Plus,
    Edit3,
    X,
    Phone,
    MapPin,
    Utensils,
    Loader2,
    RotateCcw,
    MoreVertical,
    Copy,
    Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { maskPhone } from "@/lib/utils";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BookingData {
    id: string;
    userId: string;
    user: {
        id: string;
        name: string;
        phone: string;
        alternatePhone: string | null;
        area: string;
        address: string;
        landmark: string;
        verified: boolean;
        blocked: boolean;
    };
    baseTiffinCount: number;
    todayTiffinCount: number;
    isCancelledToday: boolean;
    modificationReason: string | null;
    startDate: string;
    endDate: string;
    status: string;
    createdAt: string;
}

interface BookingsPanelProps {
    deliveryLabel: string;
    onStatsUpdate: () => void;
}

interface Area {
    name: string;
    count: number;
}

export function BookingsPanel({ deliveryLabel, onStatsUpdate }: BookingsPanelProps) {
    const { token } = useAuth();
    const [bookings, setBookings] = useState<BookingData[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [areaFilter, setAreaFilter] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingBooking, setEditingBooking] = useState<BookingData | null>(null);

    useEffect(() => {
        fetchBookings(true);
    }, [areaFilter, token]);

    const fetchBookings = async (isInitial = false) => {
        if (isInitial) {
            setIsLoading(true);
            setNextCursor(null);
        } else {
            setIsMoreLoading(true);
        }

        try {
            const params = new URLSearchParams();
            if (areaFilter) params.append("area", areaFilter);
            if (query) params.append("query", query);
            if (!isInitial && nextCursor) params.append("cursor", nextCursor);
            params.append("limit", "20");

            const res = await fetch(`/api/admin/bookings?${params}`);

            if (res.ok) {
                const data = await res.json();
                if (isInitial) {
                    setBookings(data.bookings);
                    setAreas(data.areas);
                } else {
                    setBookings(prev => {
                        const existingIds = new Set(prev.map(b => b.id));
                        const newEntries = data.bookings.filter((b: any) => !existingIds.has(b.id));
                        return [...prev, ...newEntries];
                    });
                }
                setNextCursor(data.nextCursor);
            }
        } catch (error) {
            console.error("Fetch bookings error:", error);
        } finally {
            setIsLoading(false);
            setIsMoreLoading(false);
        }
    };

    const handleSearch = () => {
        fetchBookings(true);
    };

    const handleAction = async (bookingId: string, action: string, data?: any) => {
        try {
            const res = await fetch("/api/admin/bookings", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ bookingId, action, ...data })
            });

            if (res.ok) {
                toast.success(`Action completed`);
                fetchBookings(true); // Refresh all data on action
                onStatsUpdate();
            } else {
                const err = await res.json();
                toast.error(err.error || "Action failed");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    // Filter bookings client-side for search
    const filteredBookings = bookings.filter(b => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
            b.user.name.toLowerCase().includes(q) ||
            b.user.phone.includes(q) ||
            b.user.address.toLowerCase().includes(q)
        );
    });

    // Group by area for better organization
    const groupedByArea = filteredBookings.reduce((acc, booking) => {
        const area = booking.user.area;
        if (!acc[area]) acc[area] = [];
        acc[area].push(booking);
        return acc;
    }, {} as Record<string, BookingData[]>);

    return (
        <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black">Bookings</h2>
                        <p className="text-xs text-zinc-500">{deliveryLabel}</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl text-sm"
                    >
                        <Plus className="h-4 w-4" /> Add
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search name or phone..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>
                    <select
                        value={areaFilter}
                        onChange={(e) => setAreaFilter(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-medium min-w-[100px]"
                    >
                        <option value="">All Areas</option>
                        {areas.map(area => (
                            <option key={area.name} value={area.name}>{area.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Bookings List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            ) : filteredBookings.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                    <Utensils className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No bookings found</p>
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedByArea).map(([area, areaBookings]) => (
                        <div key={area} className="space-y-1.5">
                            {/* Area Header */}
                            <div className="flex items-center gap-2 px-2">
                                <MapPin className="h-3.5 w-3.5 text-emerald-500/70" />
                                <span className="font-bold text-[11px] text-zinc-500 uppercase tracking-wider">{area}</span>
                                <span className="h-1 w-1 rounded-full bg-zinc-800" />
                                <span className="text-[10px] text-zinc-600 font-bold">
                                    {areas.find(a => a.name === area)?.count || 0} TIFFINS
                                </span>
                            </div>

                            {/* Booking Cards */}
                            <div className="space-y-1.5">
                                {areaBookings.map((booking) => (
                                    <BookingCard
                                        key={booking.id}
                                        booking={booking}
                                        onAction={handleAction}
                                        onEdit={() => setEditingBooking(booking)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Infinite Scroll Load Trigger */}
                    {nextCursor && (
                        <div
                            className="h-24 flex items-center justify-center"
                            ref={(el) => {
                                if (el) {
                                    const observer = new IntersectionObserver((entries) => {
                                        if (entries[0].isIntersecting && !isMoreLoading) {
                                            fetchBookings();
                                            observer.unobserve(el);
                                        }
                                    }, { threshold: 0.1 });
                                    observer.observe(el);
                                }
                            }}
                        >
                            {isMoreLoading && <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />}
                        </div>
                    )}
                </div>
            )}

            {/* Add Booking Modal */}
            {showAddModal && (
                <AddBookingModal
                    areas={areas.map(area => area.name)}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchBookings(true);
                        onStatsUpdate();
                    }}
                />
            )}

            {/* Edit Tiffin Modal */}
            {editingBooking && (
                <EditTiffinModal
                    booking={editingBooking}
                    onClose={() => setEditingBooking(null)}
                    onSuccess={() => {
                        setEditingBooking(null);
                        fetchBookings(true);
                        onStatsUpdate();
                    }}
                />
            )}
        </div>
    );
}

// Booking Card Component
function BookingCard({
    booking,
    onAction,
    onEdit
}: {
    booking: BookingData;
    onAction: (id: string, action: string, data?: any) => void;
    onEdit: () => void;
}) {
    const [showPhone, setShowPhone] = useState(false);

    return (
        <div
            className={`rounded-xl border overflow-hidden transition-all ${booking.isCancelledToday
                ? "bg-red-500/5 border-red-500/10"
                : "bg-zinc-900/40 border-zinc-800/60"
                }`}
        >
            <div className="p-2.5 space-y-2">
                {/* Header Section */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${booking.isCancelledToday
                            ? "bg-red-500/20 text-red-400"
                            : "bg-emerald-500/20 text-emerald-400"
                            }`}>
                            <Utensils className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                    className="font-bold text-sm truncate text-white leading-tight"
                                >
                                    {booking.user.name}
                                </span>
                                <Badge className="bg-zinc-800/80 text-zinc-400 text-[9px] px-1.5 py-0 h-4 font-medium border-zinc-700/50">
                                    {booking.user.area}
                                </Badge>
                                {!booking.user.verified && (
                                    <Badge className="bg-amber-500/10 text-amber-500 text-[9px] px-1.5 py-0 h-4 font-black border-amber-500/20">NEW</Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1.5">
                                    <a
                                        href={`tel:${booking.user.phone}`}
                                        className="h-5 w-5 flex items-center justify-center rounded-md bg-zinc-800 text-zinc-500 hover:text-emerald-400 transition-colors"
                                        title="Direct Call"
                                    >
                                        <Phone className="h-2.5 w-2.5" />
                                    </a>
                                    <span
                                        onClick={() => setShowPhone(!showPhone)}
                                        className="text-[10px] text-zinc-500 hover:text-zinc-300 font-medium transition-colors cursor-pointer"
                                    >
                                        {showPhone ? booking.user.phone : maskPhone(booking.user.phone)}
                                    </span>
                                    <CopyButton value={booking.user.phone} />
                                </div>
                                {booking.user.alternatePhone && (
                                    <div className="flex items-center gap-1.5 outline-none">
                                        <span className="text-[10px] text-zinc-600 font-medium">|</span>
                                        <a
                                            href={`tel:${booking.user.alternatePhone}`}
                                            className="h-5 w-5 flex items-center justify-center rounded-md bg-zinc-800 text-zinc-500 hover:text-zinc-400 transition-colors"
                                            title="Direct Call"
                                        >
                                            <Phone className="h-2.5 w-2.5" />
                                        </a>
                                        <span
                                            onClick={() => setShowPhone(!showPhone)}
                                            className="text-[10px] text-zinc-600 font-medium cursor-pointer"
                                        >
                                            {showPhone ? booking.user.alternatePhone : maskPhone(booking.user.alternatePhone)}
                                        </span>
                                        <CopyButton value={booking.user.alternatePhone} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 flex-shrink-0">
                        <div className="text-right">
                            <span className={`text-xl font-black tabular-nums transition-all ${booking.isCancelledToday ? "text-red-400/40 line-through" : "text-white"
                                }`}>
                                {booking.todayTiffinCount}
                            </span>
                            <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter -mt-1">Tiffins</div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-zinc-950 border-zinc-800">
                                <DropdownMenuItem
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        onEdit();
                                    }}
                                    className="gap-2 cursor-pointer"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    <span>Edit Tiffins</span>
                                </DropdownMenuItem>
                                {booking.isCancelledToday ? (
                                    <DropdownMenuItem
                                        onClick={() => onAction(booking.id, "restoreToday")}
                                        className="gap-2 cursor-pointer text-emerald-500 focus:text-emerald-400"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        <span>Restore</span>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onClick={() => onAction(booking.id, "cancelToday")}
                                        className="gap-2 cursor-pointer text-red-500 focus:text-red-400"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        <span>Cancel Today</span>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Details Section */}
                <div className="space-y-1.5">
                    <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-zinc-950/40 border border-zinc-800/30">
                        <MapPin className="h-3 w-3 text-emerald-500/70 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] text-zinc-400 leading-tight font-medium line-clamp-2 break-all">{booking.user.address}</p>
                            {booking.user.landmark && (
                                <p className="text-[9px] text-zinc-600 mt-0.5 font-bold uppercase">Near: {booking.user.landmark}</p>
                            )}
                        </div>
                    </div>

                    {booking.baseTiffinCount !== booking.todayTiffinCount && !booking.isCancelledToday && (
                        <div className="text-[9px] font-bold text-amber-500/80 bg-amber-500/5 border border-amber-500/10 rounded-md px-2 py-1 flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                            Plan: {booking.baseTiffinCount} → Today: {booking.todayTiffinCount}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-600 hover:text-zinc-400"
            title="Copy to clipboard"
        >
            {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
    );
}

// Add Booking Modal
function AddBookingModal({
    areas,
    onClose,
    onSuccess
}: {
    areas: string[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        phone: "",
        alternatePhone: "",
        name: "",
        address: "",
        landmark: "",
        area: areas[0] || "",
        pin: "3055", // Default PIN
        tiffinCount: "1"
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!form.phone || !form.name || !form.address || !form.area || !form.tiffinCount) {
            toast.error("Please fill all required fields");
            return;
        }

        if (form.phone.length !== 10 || !/^\d+$/.test(form.phone)) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }

        if (form.alternatePhone && !/^\d{10}$/.test(form.alternatePhone)) {
            toast.error("Alternate phone must be exactly 10 digits");
            return;
        }


        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                toast.success("Booking added successfully");
                onSuccess();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to add booking");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-zinc-950 p-4 border-b border-zinc-800 flex items-center justify-between z-10">
                    <h3 className="text-lg font-black">Add New Booking</h3>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone *</label>
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    setForm({ ...form, phone: val });
                                }}
                                maxLength={10}
                                placeholder="10-digit number"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Alternate Phone</label>
                            <input
                                type="tel"
                                value={form.alternatePhone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    setForm({ ...form, alternatePhone: val });
                                }}
                                maxLength={10}
                                placeholder="Optional"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Name *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Full name"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Area *</label>
                        <select
                            value={form.area}
                            onChange={(e) => setForm({ ...form, area: e.target.value })}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                        >
                            {areas.map(area => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Address *</label>
                        <textarea
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            placeholder="Complete address for delivery"
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Landmark</label>
                        <input
                            type="text"
                            value={form.landmark}
                            onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                            placeholder="Identifying nearby spot"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tiffins per day *</label>
                        <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setForm({ ...form, tiffinCount: n.toString() })}
                                    className={`h-12 rounded-xl font-black text-lg transition-all ${form.tiffinCount === n.toString()
                                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 scale-105"
                                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                        }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-zinc-950 p-4 border-t border-zinc-800 z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-emerald-500 text-black font-black rounded-2xl disabled:opacity-50 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/10"
                    >
                        {isSubmitting ? "Processing..." : "Confirm Booking"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Edit Tiffin Modal
function EditTiffinModal({
    booking,
    onClose,
    onSuccess
}: {
    booking: BookingData;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [mode, setMode] = useState<"today" | "base">("today");
    const [count, setCount] = useState(booking.todayTiffinCount);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const action = mode === "today" ? "modifyTodayCount" : "updateTiffins";
            const res = await fetch("/api/admin/bookings", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ bookingId: booking.id, action, tiffinCount: count })
            });

            if (res.ok) {
                toast.success("Updated successfully");
                onSuccess();
            } else {
                toast.error("Update failed");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full sm:max-w-sm bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 bg-zinc-950 p-4 border-b border-zinc-800 flex items-center justify-between z-10">
                    <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-800 rounded-full" />
                    <div className="mt-2 sm:mt-0">
                        <h3 className="text-lg font-black">Edit Tiffins</h3>
                        <p className="text-xs text-zinc-500">{booking.user.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white mt-2 sm:mt-0">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Mode Toggle */}
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode("today")}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === "today"
                                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/10"
                                    : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                                    }`}
                            >
                                Today Only
                            </button>
                            <button
                                onClick={() => setMode("base")}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === "base"
                                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/10"
                                    : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                                    }`}
                            >
                                Base Plan
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 text-center font-medium leading-tight">
                            {mode === "today"
                                ? "Update count for today's delivery only"
                                : "Change the default count for all future deliveries"}
                        </p>
                    </div>

                    {/* Counter Area */}
                    <div className="flex flex-col items-center justify-center py-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                        <div className="flex items-center gap-8">
                            <button
                                onClick={() => setCount(Math.max(0, count - 1))}
                                className="w-16 h-16 rounded-2xl bg-zinc-800 text-3xl font-bold hover:bg-zinc-700 transition-colors"
                            >
                                -
                            </button>
                            <div className="flex flex-col items-center">
                                <span className="text-6xl font-black tabular-nums min-w-[3.5rem] text-center">{count}</span>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest -mt-1">Tiffins</span>
                            </div>
                            <button
                                onClick={() => setCount(count + 1)}
                                className="w-16 h-16 rounded-2xl bg-zinc-800 text-3xl font-bold hover:bg-zinc-700 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-zinc-950 p-4 border-t border-zinc-800 flex gap-3 z-10">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-zinc-900 text-zinc-400 font-bold rounded-2xl hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 py-4 bg-emerald-500 text-black font-black rounded-2xl disabled:opacity-50 hover:bg-emerald-400 transition-colors"
                    >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
