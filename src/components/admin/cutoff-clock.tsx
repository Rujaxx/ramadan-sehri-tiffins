"use client";

import { useEffect, useState } from "react";
import { Clock, Lock, Unlock, Sun } from "lucide-react";
import { DateTime } from "luxon";

// Edits lock at 2 AM
const EDIT_CUTOFF_HOUR = 2;
// Target date shifts at 6 AM
const SEHRI_TRANSITION_HOUR = 6;

interface CutoffClockProps {
    serverTargetDate?: string | null;
    officialStartDate?: string | null;
}

export function CutoffClock({ serverTargetDate, officialStartDate }: CutoffClockProps) {
    const [now, setNow] = useState(DateTime.now().setZone("Asia/Kolkata"));
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            const current = DateTime.now().setZone("Asia/Kolkata");
            setNow(current);

            // Target date is tomorrow if past transition hour (6 AM), otherwise today
            const currentRealTarget = current.hour >= SEHRI_TRANSITION_HOUR
                ? current.plus({ days: 1 }).startOf("day")
                : current.startOf("day");

            // Cutoff is 2 AM of the target date
            const cutoffTime = currentRealTarget.set({ hour: EDIT_CUTOFF_HOUR, minute: 0, second: 0, millisecond: 0 });

            const isFutureStart = officialStartDate && currentRealTarget < DateTime.fromISO(officialStartDate.split('T')[0]).setZone("Asia/Kolkata").startOf("day");

            setIsLocked(current >= cutoffTime && !isFutureStart);
        }, 1000);
        return () => clearInterval(timer);
    }, [officialStartDate]);

    const timeString = now.toFormat("hh:mm a");

    // Calculate target delivery date
    const realTargetDate = now.hour >= SEHRI_TRANSITION_HOUR
        ? now.plus({ days: 1 }).startOf("day")
        : now.startOf("day");

    let targetDate = realTargetDate;
    if (officialStartDate) {
        const officialStartDT = DateTime.fromISO(officialStartDate.split('T')[0]).setZone("Asia/Kolkata").startOf("day");
        if (realTargetDate < officialStartDT) {
            targetDate = officialStartDT;
        }
    } else if (serverTargetDate) {
        targetDate = DateTime.fromISO(serverTargetDate).setZone("Asia/Kolkata").startOf("day");
    }

    const lockedDeliveryDate = now.toFormat("d MMM");
    const nextDeliveryDate = targetDate.toFormat("d MMM");

    // Calculate time until next cutoff
    let hoursUntilCutoff: number;
    let minsUntilCutoff: number;

    if (isLocked) {
        // Locked: time until tomorrow's 6 AM transition
        const nextCutoff = now.plus({ days: 1 }).set({ hour: SEHRI_TRANSITION_HOUR, minute: 0, second: 0, millisecond: 0 });
        const diff = nextCutoff.diff(now, ["hours", "minutes"]);
        hoursUntilCutoff = Math.floor(diff.hours);
        minsUntilCutoff = Math.floor(diff.minutes);
    } else {
        // Live: time until today's 2 AM or next target cycle
        let nextCutoff = realTargetDate.set({ hour: EDIT_CUTOFF_HOUR, minute: 0, second: 0, millisecond: 0 });
        if (now >= nextCutoff) {
            // Already past 2 AM, but not yet 6 AM transition
            nextCutoff = now.set({ hour: SEHRI_TRANSITION_HOUR, minute: 0, second: 0, millisecond: 0 });
        }
        const diff = nextCutoff.diff(now, ["hours", "minutes"]);
        hoursUntilCutoff = Math.floor(diff.hours);
        minsUntilCutoff = Math.floor(diff.minutes);
    }

    return (
        <div className={`p-4 rounded-2xl transition-all duration-500 border ${isLocked
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLocked ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                    }`}>
                    {isLocked ? (
                        <Sun className="h-6 w-6 text-amber-400" />
                    ) : (
                        <Clock className="h-6 w-6 text-emerald-400" />
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${isLocked ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                {isLocked
                                    ? `Locked for Sehri ${lockedDeliveryDate}`
                                    : `Live — Sehri ${nextDeliveryDate}`}
                            </p>
                            <p className="text-2xl font-black text-white font-mono">{timeString}</p>
                        </div>
                        <div className={`p-2 rounded-xl ${isLocked ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                            }`}>
                            {isLocked ? (
                                <Lock className="h-5 w-5 text-amber-400" />
                            ) : (
                                <Unlock className="h-5 w-5 text-emerald-400" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`mt-3 pt-3 border-t ${isLocked ? 'border-amber-500/20' : 'border-emerald-500/20'
                }`}>
                <p className={`text-xs ${isLocked ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
                    {isLocked ? (
                        <>
                            Sehri <span className="font-bold">{lockedDeliveryDate}</span> is finalized.
                            Changes now count for <span className="font-bold">Sehri {nextDeliveryDate}</span>.
                            Next cycle in ~{hoursUntilCutoff}h.
                        </>
                    ) : (
                        <>
                            Changes are live for <span className="font-bold">Sehri {nextDeliveryDate}</span>.
                            Cutoff at <span className="font-bold">2:00 AM</span> ({hoursUntilCutoff}h {minsUntilCutoff}m remaining).
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
