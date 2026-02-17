"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StatusCard } from "@/components/user/status-card";
import { BookingCalendar } from "@/components/user/booking-calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Calendar,
    History,
    MapPin,
    Phone,
    Utensils,
    HelpCircle,
    Info,
    ChevronLeft,
    ChevronRight,
    Truck,
    RefreshCw,
    LogOut,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { getSeasonStatus, getNextDeliveryLabel, GlobalConfig } from "@/lib/date";
import { RAMADAN_END_DATE } from "@/lib/constants";

interface BookingData {
    user: {
        name: string;
        phone: string;
        address: string;
        landmark: string;
        area: string;
    };
    booking: {
        id: string;
        tiffinCount: number;
        startDate: string;
        endDate: string;
        status: string;
        type: string;
        modifications: any[];
    } | null;
}

export default function UserDashboard() {
    const { token, isLoading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [user, setUser] = useState<BookingData['user'] | null>(null);
    const [booking, setBooking] = useState<BookingData['booking'] | null>(null);
    const [config, setConfig] = useState<GlobalConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (!token) {
                router.push("/");
                return;
            }
            fetchData();
        }
    }, [token, authLoading, router]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [bookingRes, configRes] = await Promise.all([
                fetch("/api/user/booking"),
                fetch("/api/config")
            ]);

            if (bookingRes.ok) {
                const data = await bookingRes.json();
                setBooking(data.booking);
                setUser(data.user);
            }

            if (configRes.ok) {
                const data = await configRes.json();
                setConfig(data);
            }
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecurringToggle = async (isRecurring: boolean) => {
        try {
            const res = await fetch("/api/user/booking", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    type: isRecurring ? "RECURRING" : "ONE_TIME"
                })
            });

            if (res.ok) {
                toast.success(`Delivery set to ${isRecurring ? 'Recurring' : 'One-time'}`);
                fetchData();
            } else {
                toast.error("Failed to update booking type");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!booking || !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <h2 className="text-2xl font-bold mb-2">No Booking Found</h2>
                <p className="text-muted-foreground">Please contact support if you believe this is an error.</p>
            </div>
        );
    }

    const ramadanStart = config?.officialStartDate?.toString() || "2026-02-18";
    const ramadanEnd = RAMADAN_END_DATE;

    return (
        <div className="min-h-screen pt-8 pb-24 px-4 bg-background">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex justify-between items-center text-left">
                    <div>
                        <h1 className="text-3xl font-black gradient-text">Salaam, {user?.name}</h1>
                        <p className="text-zinc-500 font-medium text-left">Apna Naka Free Sehri Service</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={logout}
                            className="p-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300"
                            title="Logout"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <span className="text-lg font-bold">{user?.name[0]}</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <StatusCard
                            status={(booking?.status as "ACTIVE" | "CANCELLED") || "ACTIVE"}
                            isRecurring={booking.type === "RECURRING"}
                            onRecurringToggle={handleRecurringToggle}
                            config={config || undefined}
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <BookingCalendar
                            bookingId={booking.id}
                            defaultTiffinCount={booking.tiffinCount}
                            startDate={ramadanStart}
                            endDate={RAMADAN_END_DATE}
                            bookingStartDate={booking.startDate}
                            bookingEndDate={booking.endDate}
                            modifications={booking.modifications}
                            isRecurring={booking.type === "RECURRING"}
                            onUpdate={fetchData}
                            config={config || undefined}
                        />
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <QuickStatCard
                        icon={<Calendar className="h-5 w-5 text-emerald-400" />}
                        label="Next Delivery"
                        value={getNextDeliveryLabel(getSeasonStatus(config || undefined), config || undefined)}
                        subtext={new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    />
                    <QuickStatCard
                        icon={<Truck className="h-5 w-5 text-cyan-400" />}
                        label="Booking Status"
                        value={booking.status === "ACTIVE" ? "Confirmed" : "Cancelled"}
                        subtext="Live"
                    />
                    <QuickStatCard
                        icon={<History className="h-5 w-5 text-purple-400" />}
                        label="Daily Tiffins"
                        value={`${booking.tiffinCount}🥘`}
                        subtext={booking.type === "RECURRING" ? "Full Ramadan" : "Custom Plan"}
                    />
                </div>

                {/* Delivery & Plan Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="premium-card bg-white/5 border-white/5">
                        <CardHeader className="pb-2 text-left">
                            <CardTitle className="text-lg text-left flex items-center gap-2">
                                <Utensils className="h-5 w-5 text-emerald-400" />
                                Your Plan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <DetailRow
                                    icon={<RefreshCw className="h-4 w-4" />}
                                    label="Plan Type"
                                    value={booking.type === "RECURRING" ? "Full Month" : "Custom Dates"}
                                />
                                <DetailRow
                                    icon={<History className="h-4 w-4" />}
                                    label="Daily Tiffins"
                                    value={`${booking.tiffinCount} per delivery`}
                                />
                                <DetailRow
                                    icon={<Calendar className="h-4 w-4" />}
                                    label="Duration"
                                    value={`${new Date(booking.startDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })} - ${new Date(booking.endDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}`}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="premium-card bg-white/5 border-white/5">
                        <CardHeader className="pb-2 text-left">
                            <CardTitle className="text-lg text-left flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-cyan-400" />
                                Delivery Address
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <DetailRow icon={<MapPin className="h-4 w-4" />} label="Area" value={user.area} />
                                <DetailRow icon={<MapPin className="h-4 w-4" />} label="Address" value={user.address} />
                                <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={user.phone} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Help Section */}
                <Card className="bg-emerald-500/5 border-emerald-500/20 rounded-3xl">
                    <CardContent className="p-4">
                        <div className="flex gap-3 text-left">
                            <HelpCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                            <div className="text-sm text-left">
                                <p className="font-semibold text-emerald-300 mb-1 text-left">Need Help?</p>
                                <p className="text-emerald-200/70 text-left">
                                    Contact us on WhatsApp at 9503206769 for any delivery issues or questions about your booking.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function QuickStatCard({ icon, label, value, subtext }: {
    icon: React.ReactNode,
    label: string,
    value: string,
    subtext?: string
}) {
    return (
        <div className="p-4 rounded-3xl bg-white/5 border border-white/5 space-y-1 text-left">
            <div className="bg-white/5 w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 mb-2">
                {icon}
            </div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-left">{label}</p>
            <p className="text-lg font-bold text-left">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground text-left">{subtext}</p>}
        </div>
    );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-start justify-between text-sm gap-4">
            <div className="flex items-center gap-2 text-zinc-500 font-medium text-left flex-shrink-0 pt-0.5">
                {icon}
                <span className="whitespace-nowrap">{label}</span>
            </div>
            <span className="font-bold text-right break-all min-w-0">{value}</span>
        </div>
    );
}
