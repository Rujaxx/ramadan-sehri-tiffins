"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    Minus,
    Plus,
    X,
    Check,
    AlertCircle,
    Info,
    ChevronLeft,
    ChevronRight,
    Undo2,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

interface BookingModification {
    id: string;
    date: string;
    tiffinCount: number | null;
    cancelled: boolean;
    reason: string | null;
}

interface BookingCalendarProps {
    bookingId: string;
    defaultTiffinCount: number;
    startDate: string;
    endDate: string;
    bookingStartDate?: string;
    bookingEndDate?: string;
    modifications?: BookingModification[];
    onUpdate?: () => void;
    isRecurring?: boolean;
    config?: any;
}

// Helper to get YYYY-MM-DD string in local time
function toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// Helper to format date for display
function formatDate(date: Date): string {
    return date.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short"
    });
}

// Helper to get day name
function getDayName(date: Date): string {
    return date.toLocaleDateString("en-IN", { weekday: "long" });
}

// Generate array of dates between start and end
function getDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

export function BookingCalendar({
    bookingId,
    defaultTiffinCount,
    startDate,
    endDate,
    bookingStartDate,
    bookingEndDate,
    modifications = [],
    onUpdate,
    isRecurring = true,
    config
}: BookingCalendarProps) {
    const { token } = useAuth();
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [pendingTiffinCount, setPendingTiffinCount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        const start = new Date(startDate);
        return today > start ? today : start;
    });

    // Get modification for a specific date
    const getModification = (date: Date): BookingModification | undefined => {
        const dateStr = toLocalDateString(date);
        return modifications.find(m => {
            const mDate = new Date(m.date);
            return toLocalDateString(mDate) === dateStr;
        });
    };

    // Get effective tiffin count for a date
    const getEffectiveTiffinCount = (date: Date): number => {
        const mod = getModification(date);
        if (mod?.cancelled) return 0;
        if (mod?.tiffinCount !== null && mod?.tiffinCount !== undefined) return mod.tiffinCount;

        if (isRecurring) return defaultTiffinCount;

        // For non-recurring (custom range), check if date is within booking range
        if (bookingStartDate && bookingEndDate) {
            const currentStr = toLocalDateString(date);
            const startStr = bookingStartDate.split('T')[0];
            const endStr = bookingEndDate.split('T')[0];
            if (currentStr >= startStr && currentStr <= endStr) {
                return defaultTiffinCount;
            }
        }

        return 0;
    };

    const isPastDate = (date: Date) => {
        if (!config?.targetDate) return false;
        const targetStr = config.targetDate.split('T')[0];
        const dateStr = toLocalDateString(date);
        return dateStr < targetStr;
    };

    // Initialize pending count when selection changes
    const currentEffectiveCount = selectedDate ? getEffectiveTiffinCount(selectedDate) : null;

    // Reset pending count when selected date change
    const handleSelectDate = (date: Date | null) => {
        setSelectedDate(date);
        if (date) {
            const count = getEffectiveTiffinCount(date);
            setPendingTiffinCount(count === 0 ? defaultTiffinCount : count);
        } else {
            setPendingTiffinCount(null);
        }
    };

    // Get dates for current week view
    const getWeekDates = (): Date[] => {
        const week: Date[] = [];
        const start = new Date(currentWeekStart);
        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            if (date <= new Date(endDate)) {
                week.push(date);
            }
        }
        return week;
    };

    const weekDates = getWeekDates();

    const navigateWeek = (direction: "prev" | "next") => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + (direction === "next" ? 7 : -7));

        const bookingStart = new Date(startDate);
        const bookingEnd = new Date(endDate);

        if (newStart >= bookingStart && newStart <= bookingEnd) {
            setCurrentWeekStart(newStart);
        }
    };

    const handleCancelDate = async (date: Date) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/bookings/modifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId,
                    date: date.toISOString(),
                    cancelled: true,
                    reason: "Cancelled by user"
                })
            });

            if (!response.ok) throw new Error("Failed to cancel");

            toast.success("Delivery Cancelled", {
                description: `No tiffin will be delivered on ${formatDate(date)}. You can undo this anytime.`
            });

            onUpdate?.();
            setSelectedDate(null);
        } catch (error) {
            toast.error("Failed to cancel", {
                description: "Please try again or contact support."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeTiffinCount = async (date: Date, newCount: number) => {
        if (newCount < 1 || newCount > 5) return;

        setIsLoading(true);
        try {
            const response = await fetch("/api/bookings/modifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId,
                    date: date.toISOString(),
                    tiffinCount: newCount,
                    cancelled: false,
                    reason: `Changed from ${defaultTiffinCount} to ${newCount} tiffins`
                })
            });

            if (!response.ok) throw new Error("Failed to update");

            toast.success("Tiffin Count Updated", {
                description: `${newCount} tiffin${newCount > 1 ? 's' : ''} will be delivered on ${formatDate(date)}.`
            });

            setPendingTiffinCount(null);
            onUpdate?.();
        } catch (error) {
            toast.error("Failed to update", {
                description: "Please try again or contact support."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestoreDefault = async (date: Date) => {
        const mod = getModification(date);

        // If in one-time mode and restoring a CANCELLED date, 
        // we likely want to switch to a MODIFIED count (default) instead of back to 0.
        if (!isRecurring && mod?.cancelled) {
            return handleChangeTiffinCount(date, defaultTiffinCount);
        }

        if (!mod) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/bookings/modifications?id=${mod.id}`, {
                method: "DELETE"
            });

            if (!response.ok) throw new Error("Failed to restore");

            toast.success(isRecurring ? "Restored to Default" : "Removed from Plan", {
                description: isRecurring
                    ? `${formatDate(date)} will now receive ${defaultTiffinCount} tiffin${defaultTiffinCount > 1 ? 's' : ''} as usual.`
                    : `${formatDate(date)} has been removed from your delivery plan.`
            });

            onUpdate?.();
            setSelectedDate(null);
        } catch (error) {
            toast.error("Failed to restore", {
                description: "Please try again or contact support."
            });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Card className="premium-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-400" />
                    Manage Your Deliveries
                </CardTitle>
                <CardDescription>
                    Tap any date to cancel or change the number of tiffins. Changes show up instantly for our volunteers.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Help Text */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex gap-3">
                        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-200/80">
                            <p className="font-semibold text-blue-300 mb-1">How this works:</p>
                            <ul className="space-y-1 list-disc list-inside">
                                <li><strong>Tap a date</strong> to see options for that day</li>
                                <li><strong>Cancel</strong> - No delivery on that date (you can undo later)</li>
                                <li><strong>Change count</strong> - Need more or fewer tiffins for a day</li>
                                <li>Changes take effect immediately</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Week Navigation */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateWeek("prev")}
                        disabled={currentWeekStart <= new Date(startDate)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">
                        {formatDate(weekDates[0])} - {formatDate(weekDates[weekDates.length - 1])}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateWeek("next")}
                        disabled={new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000) > new Date(endDate)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Week Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {weekDates.map((date) => {
                        const mod = getModification(date);
                        const isCancelled = mod?.cancelled;
                        const hasChange = mod && !mod.cancelled && mod.tiffinCount !== null;
                        const effectiveCount = getEffectiveTiffinCount(date);
                        const isPast = isPastDate(date);
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        const isToday = new Date().toDateString() === date.toDateString();

                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => !isPast && handleSelectDate(isSelected ? null : date)}
                                disabled={isPast}
                                className={`
                                    relative p-2 rounded-xl text-center transition-all
                                    ${isPast
                                        ? "opacity-40 cursor-not-allowed"
                                        : "hover:bg-white/10 cursor-pointer"
                                    }
                                    ${isSelected ? "ring-2 ring-emerald-500 bg-emerald-500/10" : ""}
                                    ${isCancelled ? "bg-red-500/10 border border-red-500/30" : ""}
                                    ${hasChange ? "bg-amber-500/10 border border-amber-500/30" : ""}
                                    ${isToday && !isCancelled && !hasChange ? "border border-emerald-500/50" : ""}
                                `}
                            >
                                <div className="text-[10px] text-muted-foreground mb-1">
                                    {date.toLocaleDateString("en-IN", { weekday: "short" })}
                                </div>
                                <div className="text-lg font-bold">
                                    {date.getDate()}
                                </div>
                                <div className={`text-xs mt-1 font-medium ${isCancelled ? "text-red-400" :
                                    hasChange ? "text-amber-400" : "text-emerald-400"
                                    }`}>
                                    {isCancelled ? "✕" : `${effectiveCount}🥘`}
                                </div>
                                {isToday && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Date Actions */}
                {selectedDate && !isPastDate(selectedDate) && (() => {
                    const dateStr = toLocalDateString(selectedDate);
                    const targetDateStr = config?.targetDate?.split('T')[0];
                    const isTodayTarget = targetDateStr === dateStr;

                    // Simple client-side hour check (assume browser local hour is same as IST for simplicity here, 
                    // or better, we could have passed server hour)
                    const isAfterCutoff = isTodayTarget && config?.isAfterCutoff;

                    return (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold">{getDayName(selectedDate)}</h4>
                                    <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Cutoff Warning */}
                            {isAfterCutoff && (
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2 text-amber-400">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="font-bold">2:00 AM Deadline Passed</p>
                                        <p>Only cancellations are allowed for today&apos;s delivery.</p>
                                    </div>
                                </div>
                            )}

                            {/* Tiffin Count Adjuster */}
                            <div className="space-y-4 pt-2">
                                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                                        Number of Tiffins
                                    </span>
                                    <div className="flex items-center gap-8">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-12 w-12 rounded-full border-2 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all"
                                            onClick={() => setPendingTiffinCount(prev => Math.max(1, (prev ?? 1) - 1))}
                                            disabled={isLoading || (pendingTiffinCount ?? 1) <= 1}
                                        >
                                            <Minus className="h-6 w-6 text-emerald-400" />
                                        </Button>

                                        <div className="flex flex-col items-center min-w-[4rem]">
                                            <span className="text-5xl font-black tracking-tighter text-emerald-50">
                                                {pendingTiffinCount}
                                            </span>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-12 w-12 rounded-full border-2 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all"
                                            onClick={() => setPendingTiffinCount(prev => Math.min(5, (prev ?? 1) + 1))}
                                            disabled={isLoading || (pendingTiffinCount ?? 1) >= 5}
                                        >
                                            <Plus className="h-6 w-6 text-emerald-400" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {getModification(selectedDate)?.cancelled ? (
                                /* Cancelled State */
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                        <p className="text-sm font-medium">Delivery currently cancelled for this date</p>
                                    </div>
                                    <Button
                                        onClick={() => handleChangeTiffinCount(selectedDate, pendingTiffinCount!)}
                                        disabled={isLoading || isAfterCutoff}
                                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-[0_8px_16px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] group disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        ) : (
                                            <Check className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                                        )}
                                        <span className="text-lg">Add to Plan ({pendingTiffinCount} tiffin{pendingTiffinCount !== 1 ? 's' : ''})</span>
                                    </Button>
                                </div>
                            ) : (
                                /* Active State */
                                <div className="space-y-3">
                                    {pendingTiffinCount !== currentEffectiveCount ? (
                                        /* Show Save if count changed */
                                        <Button
                                            onClick={() => handleChangeTiffinCount(selectedDate, pendingTiffinCount!)}
                                            disabled={isLoading || isAfterCutoff}
                                            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-[0_8px_16px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] group disabled:opacity-50"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                            ) : (
                                                <Check className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                                            )}
                                            <span className="text-lg">Update to {pendingTiffinCount} Tiffin{pendingTiffinCount !== 1 ? 's' : ''}</span>
                                        </Button>
                                    ) : (
                                        /* Regular active options */
                                        <div className="grid grid-cols-1 gap-3">
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleCancelDate(selectedDate)}
                                                disabled={isLoading}
                                                className="w-full h-12 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all"
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                Cancel Delivery
                                            </Button>

                                            {getModification(selectedDate) && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleRestoreDefault(selectedDate)}
                                                    disabled={isLoading || isAfterCutoff}
                                                    className="w-full h-12 text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-50"
                                                >
                                                    <Undo2 className="h-4 w-4 mr-2" />
                                                    Reset to Default ({defaultTiffinCount})
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                        <span>Normal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
                        <span>Modified</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" />
                        <span>Cancelled</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
