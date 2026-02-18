"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import {
    Loader2,
    ChevronLeft,
    ChevronRight,
    MapPin,
    X,
    Calendar,
} from "lucide-react";
import { DateTime } from "luxon";

interface DayData {
    date: string;
    label: string;
    tiffins: number;
    areaBreakdown: { area: string; count: number }[];
}

interface CalendarResponse {
    days: DayData[];
    month: string;
    ramadanStart: string;
    ramadanEnd: string;
}

export function CalendarPanel() {
    const { token } = useAuth();
    const [data, setData] = useState<CalendarResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(() => {
        return DateTime.now().setZone("Asia/Kolkata").toFormat("yyyy-MM");
    });
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

    useEffect(() => {
        fetchCalendar();
    }, [currentMonth, token]);

    const fetchCalendar = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/calendar?month=${currentMonth}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Calendar fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const navigateMonth = (direction: -1 | 1) => {
        const dt = DateTime.fromFormat(currentMonth, "yyyy-MM").plus({ months: direction });
        setCurrentMonth(dt.toFormat("yyyy-MM"));
        setSelectedDay(null);
    };

    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    // Build calendar grid data
    const monthDt = DateTime.fromFormat(currentMonth, "yyyy-MM", { zone: "Asia/Kolkata" });
    const monthStart = monthDt.startOf("month");
    const monthEnd = monthDt.endOf("month");
    const startDayOfWeek = monthStart.weekday % 7; // 0=Sun, 1=Mon, ...
    const daysInMonth = monthEnd.day;

    // Map day data by date key for quick lookup
    const dayMap = new Map<string, DayData>();
    data?.days?.forEach(d => dayMap.set(d.date, d));

    // Get max tiffins for color scaling
    const maxTiffins = Math.max(...(data?.days?.map(d => d.tiffins) || [1]), 1);

    // Today and Ramadan boundaries
    const today = DateTime.now().setZone("Asia/Kolkata").toFormat("yyyy-MM-dd");
    const ramadanStartStr = data?.ramadanStart || "2026-02-19";
    const ramadanEndStr = data?.ramadanEnd || "2026-03-19";

    // Get the total tiffins for the month
    const monthTotal = data?.days?.reduce((sum, d) => sum + d.tiffins, 0) || 0;
    const activeDays = data?.days?.filter(d => d.tiffins > 0).length || 0;
    const avgPerDay = activeDays > 0 ? Math.round(monthTotal / activeDays) : 0;

    // Can navigate?
    const ramStart = DateTime.fromFormat(ramadanStartStr, "yyyy-MM-dd");
    const ramEnd = DateTime.fromFormat(ramadanEndStr, "yyyy-MM-dd");
    const canGoBack = monthDt.minus({ months: 1 }).endOf("month") >= ramStart.startOf("day");
    const canGoForward = monthDt.plus({ months: 1 }).startOf("month") <= ramEnd.startOf("day");

    // Build grid cells
    const cells: (null | { day: number; dateKey: string; data: DayData | null; inRamadan: boolean })[] = [];

    // Empty cells before first day
    for (let i = 0; i < startDayOfWeek; i++) {
        cells.push(null);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
        const dateKey = monthDt.set({ day: d }).toFormat("yyyy-MM-dd");
        const inRamadan = dateKey >= ramadanStartStr && dateKey <= ramadanEndStr;
        cells.push({
            day: d,
            dateKey,
            data: dayMap.get(dateKey) || null,
            inRamadan,
        });
    }

    const getIntensityClass = (tiffins: number) => {
        if (tiffins === 0) return "bg-zinc-800/50";
        const ratio = tiffins / maxTiffins;
        if (ratio > 0.8) return "bg-gradient-to-br from-red-500/40 to-orange-500/40 border-red-500/30";
        if (ratio > 0.6) return "bg-gradient-to-br from-amber-500/30 to-orange-500/30 border-amber-500/25";
        if (ratio > 0.4) return "bg-gradient-to-br from-yellow-500/25 to-amber-500/25 border-yellow-500/20";
        if (ratio > 0.2) return "bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 border-emerald-500/20";
        return "bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 border-emerald-500/15";
    };

    const getCountColor = (tiffins: number) => {
        if (tiffins === 0) return "text-zinc-600";
        const ratio = tiffins / maxTiffins;
        if (ratio > 0.8) return "text-red-400";
        if (ratio > 0.6) return "text-amber-400";
        if (ratio > 0.4) return "text-yellow-400";
        return "text-emerald-400";
    };

    return (
        <div className="space-y-4">
            {/* Month Header + Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigateMonth(-1)}
                    disabled={!canGoBack}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-black text-white">
                        {monthDt.toFormat("LLLL yyyy")}
                    </h2>
                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                        Inventory Calendar
                    </p>
                </div>
                <button
                    onClick={() => navigateMonth(1)}
                    disabled={!canGoForward}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-center">
                    <div className="text-xl font-black text-white tabular-nums">{monthTotal.toLocaleString()}</div>
                    <div className="text-[10px] text-emerald-400 font-bold uppercase">Total</div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-center">
                    <div className="text-xl font-black text-white tabular-nums">{activeDays}</div>
                    <div className="text-[10px] text-blue-400 font-bold uppercase">Days</div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-center">
                    <div className="text-xl font-black text-white tabular-nums">{avgPerDay}</div>
                    <div className="text-[10px] text-purple-400 font-bold uppercase">Avg/Day</div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-3 sm:p-4">
                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-zinc-500 uppercase py-1">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                    {cells.map((cell, i) => {
                        if (!cell) {
                            return <div key={`empty-${i}`} className="aspect-square" />;
                        }

                        const isToday = cell.dateKey === today;
                        const tiffins = cell.data?.tiffins || 0;
                        const isSelected = selectedDay?.date === cell.dateKey;

                        if (!cell.inRamadan) {
                            return (
                                <div
                                    key={cell.dateKey}
                                    className="aspect-square rounded-lg bg-zinc-900/50 flex flex-col items-center justify-center opacity-30"
                                >
                                    <span className="text-[10px] text-zinc-600">{cell.day}</span>
                                </div>
                            );
                        }

                        return (
                            <button
                                key={cell.dateKey}
                                onClick={() => setSelectedDay(isSelected ? null : (cell.data || { date: cell.dateKey, label: `${cell.day}`, tiffins: 0, areaBreakdown: [] }))}
                                className={`
                                    aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5
                                    transition-all duration-200 cursor-pointer relative
                                    ${getIntensityClass(tiffins)}
                                    ${isToday ? "ring-2 ring-emerald-500 ring-offset-1 ring-offset-zinc-900" : ""}
                                    ${isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900 scale-105" : "hover:scale-105"}
                                `}
                            >
                                <span className={`text-[10px] font-medium ${isToday ? "text-emerald-400" : "text-zinc-400"}`}>
                                    {cell.day}
                                </span>
                                {tiffins > 0 && (
                                    <span className={`text-xs sm:text-sm font-black tabular-nums ${getCountColor(tiffins)}`}>
                                        {tiffins}
                                    </span>
                                )}
                                {tiffins === 0 && (
                                    <span className="text-[9px] text-zinc-700">—</span>
                                )}
                                {isToday && (
                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-zinc-800">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/20" />
                        <span className="text-[9px] text-zinc-500">Low</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-yellow-500/30 border border-yellow-500/20" />
                        <span className="text-[9px] text-zinc-500">Medium</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/35 border border-amber-500/25" />
                        <span className="text-[9px] text-zinc-500">High</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-red-500/40 border border-red-500/30" />
                        <span className="text-[9px] text-zinc-500">Peak</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] text-zinc-500">Today</span>
                    </div>
                </div>
            </div>

            {/* Selected Day Detail */}
            {selectedDay && (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                    {/* Detail Header */}
                    <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white">
                                    {DateTime.fromFormat(selectedDay.date, "yyyy-MM-dd").toFormat("d LLLL, cccc")}
                                </h3>
                                <p className="text-[10px] text-zinc-500 font-medium">
                                    Sehri Delivery — <span className="text-emerald-400 font-bold">{selectedDay.tiffins} tiffins</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedDay(null)}
                            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Area Breakdown */}
                    <div className="p-4">
                        {selectedDay.areaBreakdown.length === 0 ? (
                            <p className="text-sm text-zinc-600 text-center py-4">No bookings for this day</p>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-1">
                                    Area-wise Breakdown
                                </div>
                                {selectedDay.areaBreakdown
                                    .sort((a, b) => b.count - a.count)
                                    .map(area => {
                                        const areaRatio = selectedDay.tiffins > 0 ? (area.count / selectedDay.tiffins) * 100 : 0;
                                        return (
                                            <div
                                                key={area.area}
                                                className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-800/50 border border-zinc-800"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                    <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-white truncate">{area.area}</div>
                                                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${Math.max(areaRatio, 3)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-sm font-black text-white tabular-nums">{area.count}</span>
                                                    <span className="text-[9px] text-zinc-600 ml-1">({Math.round(areaRatio)}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Loading overlay for month transitions */}
            {isLoading && data && (
                <div className="fixed inset-0 bg-zinc-950/50 flex items-center justify-center z-50 pointer-events-none">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
            )}
        </div>
    );
}
