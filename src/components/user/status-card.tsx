"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { DateTime } from "luxon";
import { getSeasonStatus, GlobalConfig, getEffectiveDeliveryDate } from "@/lib/date";

interface StatusCardProps {
    status: "ACTIVE" | "CANCELLED";
    isRecurring?: boolean;
    onRecurringToggle?: (val: boolean) => void;
    config?: GlobalConfig;
    effectiveTiffins?: number;
    isDelivered?: boolean;
}

export function StatusCard({
    status,
    isRecurring = true,
    onRecurringToggle,
    config,
    effectiveTiffins,
    isDelivered
}: StatusCardProps) {
    const [showMicroCopy, setShowMicroCopy] = useState(false);

    const handleToggle = (checked: boolean) => {
        onRecurringToggle?.(checked);
        if (!checked) {
            setShowMicroCopy(true);
            setTimeout(() => setShowMicroCopy(false), 5000);
        }
    };

    const isActive = status === "ACTIVE";
    const season = getSeasonStatus(config);

    const getStatusMessage = () => {
        const targetDate = getEffectiveDeliveryDate();
        const now = DateTime.now().setZone("Asia/Kolkata");
        const relativeLabel = targetDate.hasSame(now, 'day') ? "today" : "tomorrow";

        if (isDelivered) return `Sehri for ${relativeLabel} is Delivered.`;
        if (!isActive || effectiveTiffins === 0) return `No delivery scheduled for ${relativeLabel}.`;

        switch (season) {
            case "PRE_SEASON":
                const fallbackDate = config?.officialStartDate
                    ? (typeof config.officialStartDate === "string"
                        ? DateTime.fromISO(config.officialStartDate.split('T')[0]).setZone("Asia/Kolkata").toFormat("d MMM")
                        : DateTime.fromJSDate(config.officialStartDate).setZone("Asia/Kolkata").toFormat("d MMM"))
                    : "Feb 19";
                return `Awaiting Ramadan. Starts: ${fallbackDate}`;
            case "POST_SEASON":
                return "Ramadan 1447 has ended. JazakAllah!";
            default:
                return `Your Sehri for ${relativeLabel} is Confirmed.`;
        }
    };

    return (
        <Card className="premium-card overflow-hidden">
            <CardContent className="p-0">
                <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-semibold opacity-80">Delivery Status</h3>
                            <p className="text-2xl font-bold">
                                {getStatusMessage()}
                            </p>
                        </div>
                        <div className={`pulsing-dot ${isActive ? 'pulsing-dot-active' : 'pulsing-dot-inactive'}`} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-background/40 rounded-2xl border border-white/5 shadow-inner">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRecurring ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                                <Badge variant="outline" className="border-none p-0">
                                    {isRecurring ? "ON" : "OFF"}
                                </Badge>
                            </div>
                            <div>
                                <p className="font-semibold">Recurring Delivery</p>
                                <p className="text-sm opacity-60">
                                    {isRecurring
                                        ? "Daily till end of Ramadan"
                                        : "Only on specific dates chosen in calendar"}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={isRecurring}
                            onCheckedChange={handleToggle}
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </div>

                    {showMicroCopy && !isRecurring && (
                        <div className="mt-4 flex items-start gap-2 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <Info className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-cyan-200/80">
                                We’ll stop your daily delivery starting the day after tomorrow.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
