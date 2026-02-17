import { DateTime } from "luxon";

/**
 * Calculate the target delivery date (Sehri date) based on current time.
 * For "8th Feb Sehri", window is: 7th Feb 6AM → 8th Feb 6AM IST
 * 
 * Always uses today's real date — no clamping to officialStartDate.
 */
export function getDeliveryWindow() {
    const now = DateTime.now().setZone("Asia/Kolkata");

    // After 6 AM → target is tomorrow's Sehri; before 6 AM → target is today's Sehri
    const targetDate = now.hour >= 6
        ? now.plus({ days: 1 }).startOf("day")
        : now.startOf("day");

    // Window: previous day 6AM to target day 6AM
    const windowStart = targetDate.minus({ days: 1 }).set({ hour: 6, minute: 0, second: 0 });
    const windowEnd = targetDate.set({ hour: 6, minute: 0, second: 0 });

    return {
        targetDate,
        windowStart,
        windowEnd,
        displayLabel: `Sehri for ${targetDate.toFormat("LLL d")}`,
        displayDate: targetDate.toFormat("yyyy-MM-dd"),
    };
}
