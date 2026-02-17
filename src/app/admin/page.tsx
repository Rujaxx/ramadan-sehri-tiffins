"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookingsPanel } from "@/components/admin/bookings-panel";
import { VolunteerPanel } from "@/components/admin/volunteer-panel";
import { AnalyticsPanel } from "@/components/admin/analytics-panel";
import { CutoffClock } from "@/components/admin/cutoff-clock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import {
    Utensils,
    Users,
    BarChart3,
    Loader2,
    Calendar,
    CheckCircle2,
    MapPin,
    UserCheck,
    RefreshCw,
    Moon,
    Power,
    TrendingUp,
    LogOut,
    ShieldAlert,
    Phone,
    PhoneCall,
    Minus,
    Plus,
    ShieldCheck,
    Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import { UserManagement } from "@/components/admin/user-management";

interface Stats {
    totalTiffins: number;
    activeUsers: number;
    unverifiedUsers: number;
    todayCancellations: number;
    volunteerCount: number;
    capacity: number;
    unverifiedList: {
        id: string;
        name: string;
        phone: string;
        alternatePhone?: string | null;
        area: string;
        address: string;
        landmark?: string | null;
        pin: string;
        tiffinCount: number;
        bookingType: string;
        startDate?: string;
        endDate?: string;
    }[];
}

interface DeliveryInfo {
    displayLabel: string;
    displayDate: string;
    windowStart: string;
    windowEnd: string;
}

interface AreaBreakdown {
    area: string;
    totalTiffins: number;
    newUsers: number;
    volunteers: string[];
}

interface RamadanConfig {
    ramadanStarted: boolean;
    ramadanEnded: boolean;
    officialStartDate: string | null;
}

type TabType = "bookings" | "volunteers" | "overview" | "analytics" | "users";

export default function AdminPage() {
    const { user: authUser, token, logout, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
    const [areaData, setAreaData] = useState<AreaBreakdown[]>([]);
    const [config, setConfig] = useState<RamadanConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("bookings");

    useEffect(() => {
        if (!authLoading) {
            if (!token || authUser?.role !== "ADMIN") {
                router.push("/");
                return;
            }
            fetchStats();
            fetchConfig();
        }
    }, [token, authLoading, authUser, router]);

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/config");
            if (res.ok) {
                setConfig(await res.json());
            }
        } catch (error) {
            console.error("Config fetch error:", error);
        }
    };

    const fetchStats = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch("/api/admin/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setAreaData(data.areaBreakdown);
                setDeliveryInfo(data.deliveryInfo);
            }
        } catch (error) {
            console.error("Fetch stats error:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleVerifyUser = async (user: any, updatedTiffinCount?: number) => {
        const tCount = updatedTiffinCount ?? user.tiffinCount;
        const confirmMsg = `Verify ${user.name}?\n\nAddress: ${user.address}\nTiffins: ${tCount}\nType: ${user.bookingType}\nDuration: ${user.startDate ? new Date(user.startDate).toLocaleDateString() : 'N/A'} to ${user.endDate ? new Date(user.endDate).toLocaleDateString() : 'N/A'}`;

        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: user.id,
                    verified: true,
                    tiffinCount: tCount // Allow updating during verification
                })
            });

            if (res.ok) {
                toast.success("User verified successfully");
                fetchStats();
            } else if (res.status !== 401) {
                toast.error("Failed to verify user");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };


    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Sticky Header */}
            <header className="bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    {/* Top Row: Title & Actions */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-black text-white">Apna Naka Free Sehri Service</h1>
                            <p className="text-xs text-zinc-500">Admin Logistics Dashboard</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchStats}
                                disabled={isRefreshing}
                                className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
                                title="Refresh"
                            >
                                <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
                            </button>
                            <button
                                onClick={logout}
                                className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors ml-2"
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Delivery Date Hero */}
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live Count</span>
                            </div>
                            <h2 className="text-lg font-bold text-white">
                                {deliveryInfo?.displayLabel || "Loading..."}
                            </h2>
                        </div>
                        <div className="text-right">
                            <span className="text-4xl font-black text-white tabular-nums">
                                {stats?.totalTiffins || 0}
                            </span>
                            <p className="text-xs text-zinc-500">tiffins</p>
                        </div>
                    </div>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-4 gap-2 mt-4">
                        <QuickStat
                            label="Users"
                            value={stats?.activeUsers || 0}
                            icon={<Users className="h-3 w-3" />}
                        />
                        <QuickStat
                            label="Unverified"
                            value={stats?.unverifiedUsers || 0}
                            icon={<UserCheck className="h-3 w-3" />}
                            highlight={stats?.unverifiedUsers ? true : false}
                        />
                        <QuickStat
                            label="Cancelled"
                            value={stats?.todayCancellations || 0}
                            icon={<Calendar className="h-3 w-3" />}
                        />
                        <QuickStat
                            label="Volunteers"
                            value={stats?.volunteerCount || 0}
                            icon={<Truck className="h-3 w-3" />}
                        />
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 mt-4">
                        <TabButton
                            active={activeTab === "bookings"}
                            onClick={() => setActiveTab("bookings")}
                            icon={<Utensils className="h-4 w-4" />}
                            label="Bookings"
                        />
                        <TabButton
                            active={activeTab === "users"}
                            onClick={() => setActiveTab("users")}
                            icon={<Users className="h-4 w-4" />}
                            label="Users"
                        />
                        <TabButton
                            active={activeTab === "volunteers"}
                            onClick={() => setActiveTab("volunteers")}
                            icon={<Truck className="h-4 w-4" />}
                            label="Volunteers"
                        />
                        <TabButton
                            active={activeTab === "analytics"}
                            onClick={() => setActiveTab("analytics")}
                            icon={<TrendingUp className="h-4 w-4" />}
                            label="Analytics"
                        />
                        <TabButton
                            active={activeTab === "overview"}
                            onClick={() => setActiveTab("overview")}
                            icon={<BarChart3 className="h-4 w-4" />}
                            label="Overview"
                        />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 py-6">
                {activeTab === "bookings" && (
                    <BookingsPanel
                        deliveryLabel={deliveryInfo?.displayLabel || ""}
                        onStatsUpdate={fetchStats}
                    />
                )}

                {activeTab === "volunteers" && (
                    <VolunteerPanel />
                )}

                {activeTab === "overview" && (
                    <OverviewPanel
                        stats={stats}
                        areaData={areaData}
                        deliveryInfo={deliveryInfo}
                        config={config}
                        token={token}
                        onConfigUpdate={fetchConfig}
                        onVerifyUser={handleVerifyUser}
                    />
                )}

                {activeTab === "analytics" && (
                    <AnalyticsPanel />
                )}

                {activeTab === "users" && (
                    <UserManagement />
                )}
            </main>
        </div>
    );
}

// Quick Stat Component
function QuickStat({
    label,
    value,
    icon,
    highlight = false
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    highlight?: boolean;
}) {
    return (
        <div className={`p-2 rounded-xl text-center ${highlight ? "bg-amber-500/10 border border-amber-500/20" : "bg-zinc-900 border border-zinc-800"
            }`}>
            <div className={`flex items-center justify-center gap-1 mb-0.5 ${highlight ? "text-amber-400" : "text-zinc-500"
                }`}>
                {icon}
            </div>
            <div className={`text-lg font-black ${highlight ? "text-amber-400" : "text-white"}`}>
                {value}
            </div>
            <div className="text-[10px] text-zinc-600 font-medium">{label}</div>
        </div>
    );
}

// Tab Button Component
function TabButton({
    active,
    onClick,
    icon,
    label
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${active
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-500 hover:text-white"
                }`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

// Ramadan Season Control
function RamadanControl({
    config,
    token,
    onUpdate
}: {
    config: RamadanConfig | null;
    token: string | null;
    onUpdate: () => void;
}) {
    const [startDate, setStartDate] = useState("2026-02-19");
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync internal state with config when it loads
    useEffect(() => {
        if (config?.officialStartDate) {
            setStartDate(new Date(config.officialStartDate).toISOString().split('T')[0]);
        }
    }, [config]);

    const handleAction = async (action: "start" | "end" | "updateDate") => {
        if (action !== "updateDate") {
            const confirmMsg = action === "start"
                ? "Start Ramadan season? Users will be able to place bookings."
                : "End Ramadan season? This will stop all bookings.";
            if (!confirm(confirmMsg)) return;
        }

        setIsUpdating(true);
        try {
            const body: any = {};
            if (action === "start") {
                body.ramadanStarted = true;
                body.ramadanEnded = false;
                body.officialStartDate = startDate;
            } else if (action === "end") {
                body.ramadanEnded = true;
            } else if (action === "updateDate") {
                body.officialStartDate = startDate;
            }

            const res = await fetch("/api/admin/config", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(
                    action === "start" ? "Ramadan started!" :
                        action === "end" ? "Ramadan ended" : "Start date updated"
                );
                // Refresh the whole app to ensure all components and date logic across the app sync with the new config
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                toast.error("Failed to update config");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsUpdating(false);
        }
    };

    const isActive = config?.ramadanStarted && !config?.ramadanEnded;
    const hasEnded = config?.ramadanEnded;

    return (
        <div className={`p-4 rounded-2xl border transition-all ${isActive
            ? "bg-emerald-500/10 border-emerald-500/20"
            : hasEnded
                ? "bg-zinc-900 border-zinc-800"
                : "bg-amber-500/10 border-amber-500/20"
            }`}>
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? "bg-emerald-500/20" : "bg-zinc-800"
                    }`}>
                    <Moon className={`h-5 w-5 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold">Ramadan Season</h3>
                        {isActive && <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] h-4">LIVE</Badge>}
                    </div>
                    <p className={`text-xs font-medium ${isActive ? "text-emerald-400" : hasEnded ? "text-zinc-500" : "text-amber-400"
                        }`}>
                        {isActive ? "Active — Bookings Live" : hasEnded ? "Season Ended" : "Preparing Season"}
                    </p>
                </div>
                <div className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
                    }`} />
            </div>

            {/* Date Picker (Always editable) */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Configure Start Date</label>
                    {startDate !== (config?.officialStartDate?.split('T')[0]) && (
                        <button
                            onClick={() => handleAction("updateDate")}
                            disabled={isUpdating}
                            className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                            <Calendar className="h-3 w-3" /> SAVE CHANGES
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <select
                        value={startDate.split("-")[2] || "18"}
                        onChange={(e) => {
                            const parts = startDate.split("-");
                            setStartDate(`${parts[0]}-${parts[1]}-${e.target.value.padStart(2, "0")}`);
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-700 appearance-none text-center"
                    >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={String(d).padStart(2, "0")}>{d}</option>
                        ))}
                    </select>
                    <select
                        value={startDate.split("-")[1] || "02"}
                        onChange={(e) => {
                            const parts = startDate.split("-");
                            setStartDate(`${parts[0]}-${e.target.value}-${parts[2]}`);
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-700 appearance-none text-center"
                    >
                        {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((m, i) => (
                            <option key={m} value={m}>{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]}</option>
                        ))}
                    </select>
                    <select
                        value={startDate.split("-")[0] || "2026"}
                        onChange={(e) => {
                            const parts = startDate.split("-");
                            setStartDate(`${e.target.value}-${parts[1]}-${parts[2]}`);
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-700 appearance-none text-center"
                    >
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                    </select>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2 text-center font-medium">
                    Timeline starts on <span className="text-zinc-400">{new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                </p>
            </div>

            <div className="flex gap-2">
                {!isActive && !hasEnded && (
                    <button
                        onClick={() => handleAction("start")}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black font-black rounded-xl disabled:opacity-50 text-sm"
                    >
                        <Power className="h-4 w-4" /> Start Season
                    </button>
                )}
                {isActive && (
                    <button
                        onClick={() => handleAction("end")}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 font-black rounded-xl disabled:opacity-50 text-sm border border-red-500/20"
                    >
                        <Power className="h-4 w-4" /> End Season
                    </button>
                )}
                {hasEnded && (
                    <button
                        onClick={() => handleAction("start")}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-black font-black rounded-xl disabled:opacity-50 text-sm"
                    >
                        <RefreshCw className="h-4 w-4" /> Restart Season
                    </button>
                )}
            </div>
        </div>
    );
}

// Overview Panel
function OverviewPanel({
    stats,
    areaData,
    deliveryInfo,
    config,
    token,
    onConfigUpdate,
    onVerifyUser
}: {
    stats: Stats | null;
    areaData: AreaBreakdown[];
    deliveryInfo: DeliveryInfo | null;
    config: RamadanConfig | null;
    token: string | null;
    onConfigUpdate: () => void;
    onVerifyUser: (user: any) => void;
}) {
    return (
        <div className="space-y-6">
            {/* Ramadan Season Control */}
            <RamadanControl config={config} token={token} onUpdate={onConfigUpdate} />

            {/* Priority: Register & Book */}
            {stats?.unverifiedList && stats.unverifiedList.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" /> Priority: Register & Book
                        </h3>
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                            {stats.unverifiedUsers} pending
                        </Badge>
                    </div>
                    <div className="grid gap-4">
                        {stats.unverifiedList.map(user => (
                            <UnverifiedUserCard
                                key={user.id}
                                user={user}
                                onVerify={onVerifyUser}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Cutoff Clock */}
            <CutoffClock
                serverTargetDate={deliveryInfo?.displayDate}
                officialStartDate={config?.officialStartDate}
            />

            {/* Capacity */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-zinc-400">Production Capacity</span>
                        <span className="text-sm font-bold">{stats?.capacity || 0}%</span>
                    </div>
                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                            style={{ width: `${stats?.capacity || 0}%` }}
                        />
                    </div>
                    <p className="text-xs text-zinc-600 mt-2">Maximum daily capacity: 500 tiffins</p>
                </CardContent>
            </Card>

            {/* Area Breakdown */}
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider px-1">
                    Area Breakdown
                </h3>
                {areaData.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600">
                        No area data available
                    </div>
                ) : (
                    <div className="space-y-2">
                        {areaData.map((area) => (
                            <div
                                key={area.area}
                                className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold">{area.area}</div>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            {area.volunteers.length > 0 ? (
                                                <span>{area.volunteers.join(", ")}</span>
                                            ) : (
                                                <span className="text-amber-500">No volunteer assigned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black">{area.totalTiffins}</div>
                                    <div className="text-[10px] text-zinc-600">tiffins</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Time Window Info */}
            {deliveryInfo && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-zinc-500" />
                            <span className="text-xs font-bold text-zinc-500 uppercase">Delivery Window</span>
                        </div>
                        <p className="text-sm text-zinc-400">
                            Orders from <span className="text-white font-bold">6:00 AM yesterday</span> to{" "}
                            <span className="text-white font-bold">6:00 AM today</span> count towards{" "}
                            <span className="text-emerald-400 font-bold">{deliveryInfo.displayLabel}</span>
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// Unverified User Card with Local State for Tiffin Adjustment
function UnverifiedUserCard({
    user,
    onVerify
}: {
    user: any;
    onVerify: (user: any, count: number) => void;
}) {
    const [count, setCount] = useState(user.tiffinCount);

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative group">
            <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                        <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="font-bold text-sm text-white">{user.name}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">
                            <span className="text-zinc-400">{user.area}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => onVerify(user, count)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-black font-black text-xs rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    VERIFY
                </button>
            </div>

            <div className="p-4 bg-zinc-950/40 grid grid-cols-2 gap-5">
                {/* Tiffin Editor */}
                <div className="col-span-2 flex items-center justify-between p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                    <div className="space-y-0.5">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Verify Tiffins</p>
                        <p className="text-[10px] text-zinc-400 font-medium italic">Confirmed during call?</p>
                    </div>
                    <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-lg border border-zinc-800">
                        <button
                            onClick={() => setCount(Math.max(1, count - 1))}
                            className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 text-zinc-400"
                        >
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-lg font-black min-w-[1.5rem] text-center text-emerald-400">{count}</span>
                        <button
                            onClick={() => setCount(count + 1)}
                            className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 text-zinc-400"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                <div className="space-y-2.5">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Contact Numbers</p>
                    <div className="flex flex-col gap-2.5">
                        <a
                            href={`tel:${user.phone}`}
                            className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/5 px-2 py-1.5 rounded-lg border border-emerald-500/10"
                        >
                            <PhoneCall className="h-3.5 w-3.5" /> {user.phone}
                        </a>
                        {user.alternatePhone && (
                            <a
                                href={`tel:${user.alternatePhone}`}
                                className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-300 transition-colors bg-zinc-900 px-2 py-1.5 rounded-lg border border-zinc-800"
                            >
                                <Phone className="h-3.5 w-3.5" /> {user.alternatePhone}
                            </a>
                        )}
                    </div>
                </div>

                <div className="space-y-2.5 text-right">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Booking Info</p>
                    <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[8px] h-4">{user.bookingType.replace('_', ' ')}</Badge>
                        <p className="text-[10px] font-black text-white bg-white/5 px-2 py-1 rounded-md">
                            {user.startDate ? new Date(user.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                            <span className="mx-1 text-zinc-600">→</span>
                            {user.endDate ? new Date(user.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                        </p>
                    </div>
                </div>

                <div className="col-span-2 pt-3 border-t border-zinc-800/50">
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5">Full Delivery Address</p>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[11px] leading-relaxed text-zinc-300 font-medium">
                            {user.address}
                            {user.landmark && (
                                <span className="block mt-1 text-amber-500/80 text-[10px] font-bold">
                                    LANDMARK: {user.landmark}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
