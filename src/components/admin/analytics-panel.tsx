"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import {
    Loader2,
    TrendingUp,
    Calendar,
    Utensils,
    Users,
    MapPin,
    ChevronDown,
    ChevronUp,
    Award,
    Phone,
} from "lucide-react";

interface Summary {
    grandTotal: number;
    totalCancellations: number;
    activeDays: number;
    avgPerDay: number;
}

interface DailyData {
    date: string;
    label: string;
    tiffins: number;
    cancellations: number;
}

interface VolunteerStat {
    id: string;
    name: string;
    phone: string;
    areas: string[];
    areaCount: number;
    tiffinsDelivered: number;
    available: boolean;
}

interface UserConsumption {
    name: string;
    phone: string;
    area: string;
    totalTiffins: number;
    activeDays: number;
}

export function AnalyticsPanel() {
    const { token } = useAuth();
    const [summary, setSummary] = useState<Summary | null>(null);
    const [dailyData, setDailyData] = useState<DailyData[]>([]);
    const [volunteerStats, setVolunteerStats] = useState<VolunteerStat[]>([]);
    const [userConsumption, setUserConsumption] = useState<UserConsumption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAllUsers, setShowAllUsers] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, [token]);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/analytics");
            if (res.ok) {
                const data = await res.json();
                setSummary(data.summary);
                setDailyData(data.dailyData);
                setVolunteerStats(data.volunteerStats);
                setUserConsumption(data.userConsumption);
            }
        } catch (error) {
            console.error("Analytics fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    const maxTiffins = Math.max(...dailyData.map(d => d.tiffins), 1);
    const visibleUsers = showAllUsers ? userConsumption : userConsumption.slice(0, 10);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <SummaryCard
                    label="Total Tiffins"
                    value={summary?.grandTotal || 0}
                    icon={<Utensils className="h-4 w-4" />}
                    gradient="from-emerald-500/20 to-cyan-500/20"
                    borderColor="border-emerald-500/30"
                    textColor="text-emerald-400"
                />
                <SummaryCard
                    label="Active Days"
                    value={summary?.activeDays || 0}
                    icon={<Calendar className="h-4 w-4" />}
                    gradient="from-blue-500/20 to-indigo-500/20"
                    borderColor="border-blue-500/30"
                    textColor="text-blue-400"
                />
                <SummaryCard
                    label="Avg / Day"
                    value={summary?.avgPerDay || 0}
                    icon={<TrendingUp className="h-4 w-4" />}
                    gradient="from-purple-500/20 to-pink-500/20"
                    borderColor="border-purple-500/30"
                    textColor="text-purple-400"
                />
            </div>

            {/* Daily Trend Chart */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Daily Tiffins</h3>
                </div>
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                    {dailyData.map(day => (
                        <div key={day.date} className="group flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 w-14 shrink-0 font-mono">
                                {day.label}
                            </span>
                            <div className="flex-1 h-6 bg-zinc-800/50 rounded-md overflow-hidden relative">
                                <div
                                    className="h-full rounded-md bg-gradient-to-r from-emerald-500/80 to-emerald-400/60 transition-all duration-500"
                                    style={{ width: `${Math.max((day.tiffins / maxTiffins) * 100, 2)}%` }}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 group-hover:text-white transition-colors">
                                    {day.tiffins}
                                </span>
                            </div>
                            {day.cancellations > 0 && (
                                <span className="text-[9px] text-red-400/70 w-6 text-right shrink-0">
                                    −{day.cancellations}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                {dailyData.length === 0 && (
                    <p className="text-center text-zinc-600 text-sm py-8">No data yet</p>
                )}
            </div>

            {/* Volunteer Leaderboard */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Award className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Volunteer Leaderboard</h3>
                    <span className="text-[10px] text-zinc-600 ml-auto">{volunteerStats.length} total</span>
                </div>
                <div className="space-y-2">
                    {volunteerStats
                        .map((vol, i) => (
                            <div
                                key={vol.id}
                                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-800"
                            >
                                {/* Rank */}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                    i === 1 ? "bg-zinc-400/20 text-zinc-300 border border-zinc-500/30" :
                                        i === 2 ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                                            "bg-zinc-800 text-zinc-500"
                                    }`}>
                                    {i + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white truncate">{vol.name}</span>
                                        {!vol.available && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                                Away
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0.5 mt-0.5">
                                        <div className="flex items-start gap-1">
                                            <MapPin className="h-3 w-3 text-zinc-600 shrink-0 mt-0.5" />
                                            <span className="text-[10px] text-zinc-500 break-all line-clamp-1">
                                                {vol.areas.length > 0 ? vol.areas.join(", ") : "No areas"}
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-1">
                                            <Phone className="h-2.5 w-2.5 text-zinc-600 shrink-0 mt-0.5" />
                                            <span className="text-[10px] text-zinc-500 break-all">
                                                {vol.phone}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="text-lg font-black text-emerald-400">{vol.tiffinsDelivered}</div>
                                    <div className="text-[9px] text-zinc-600">tiffins</div>
                                </div>
                            </div>
                        ))}
                    {volunteerStats.length === 0 && (
                        <p className="text-center text-zinc-600 text-sm py-6">No volunteers yet</p>
                    )}
                </div>
            </div>

            {/* User Consumption Log */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">User Consumption</h3>
                    <span className="text-[10px] text-zinc-600 ml-auto">{userConsumption.length} users</span>
                </div>

                {/* Header Row */}
                <div className="grid grid-cols-[1fr_60px_50px] gap-2 px-3 pb-2 mb-1 border-b border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">User</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase text-right">Tiffins</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase text-right">Days</span>
                </div>

                <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
                    {visibleUsers.map((user, i) => (
                        <div
                            key={`${user.phone}-${i}`}
                            className="grid grid-cols-[1fr_60px_50px] gap-2 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-white truncate">{user.name}</div>
                                <div className="flex flex-col gap-0.5 mt-0.5">
                                    <div className="flex items-start gap-1.5">
                                        <Phone className="h-2.5 w-2.5 text-zinc-600 shrink-0 mt-0.5" />
                                        <span className="text-[10px] text-zinc-500 break-all">{user.phone}</span>
                                    </div>
                                    <div className="flex items-start gap-1.5">
                                        <MapPin className="h-2.5 w-2.5 text-zinc-600 shrink-0 mt-0.5" />
                                        <span className="text-[10px] text-zinc-600 break-all">{user.area}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right self-center">
                                <span className="text-sm font-black text-white tabular-nums">{user.totalTiffins}</span>
                            </div>
                            <div className="text-right self-center">
                                <span className="text-xs text-zinc-500 tabular-nums">{user.activeDays}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {userConsumption.length > 10 && (
                    <button
                        onClick={() => setShowAllUsers(!showAllUsers)}
                        className="w-full mt-3 py-2 text-xs font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1 transition-colors"
                    >
                        {showAllUsers ? (
                            <>Show Less <ChevronUp className="h-3 w-3" /></>
                        ) : (
                            <>Show All {userConsumption.length} Users <ChevronDown className="h-3 w-3" /></>
                        )}
                    </button>
                )}

                {userConsumption.length === 0 && (
                    <p className="text-center text-zinc-600 text-sm py-6">No consumption data yet</p>
                )}
            </div>
        </div>
    );
}

function SummaryCard({
    label,
    value,
    icon,
    gradient,
    borderColor,
    textColor,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    gradient: string;
    borderColor: string;
    textColor: string;
}) {
    return (
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} border ${borderColor}`}>
            <div className={`flex items-center gap-1.5 mb-1 ${textColor}`}>
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">{value.toLocaleString()}</div>
        </div>
    );
}
