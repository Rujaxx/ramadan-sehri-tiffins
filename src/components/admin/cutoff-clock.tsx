"use client";

import { useEffect, useState } from "react";
import { Clock, Lock, Unlock, Sun } from "lucide-react";

// 6 AM cutoff for Sehri deliveries
const SEHRI_CUTOFF_HOUR = 6;

export function CutoffClock() {
    const [time, setTime] = useState(new Date());
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setTime(now);
            // Locked after 6 AM (cutoff passed for today's delivery)
            setIsLocked(now.getHours() >= SEHRI_CUTOFF_HOUR);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = time.toLocaleTimeString("en-IN", {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    // Calculate target delivery date
    // After 6 AM → changes go to tomorrow. Before 6 AM → changes go to today.
    const todayDate = new Date(time);
    const tomorrowDate = new Date(time);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    const lockedDeliveryDate = todayDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const nextDeliveryDate = isLocked
        ? tomorrowDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        : todayDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    // Calculate time until next cutoff
    const hoursUntilCutoff = isLocked
        ? 24 - time.getHours() + SEHRI_CUTOFF_HOUR
        : SEHRI_CUTOFF_HOUR - time.getHours();
    const minsUntilCutoff = 60 - time.getMinutes();

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
                            Cutoff resets in ~{hoursUntilCutoff}h.
                        </>
                    ) : (
                        <>
                            Changes are live for <span className="font-bold">Sehri {nextDeliveryDate}</span>.
                            Cutoff at <span className="font-bold">6:00 AM</span> ({hoursUntilCutoff}h {minsUntilCutoff}m remaining).
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
