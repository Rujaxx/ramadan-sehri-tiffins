import { DateTime } from "luxon";
import { db } from "./db";

/**
 * Calculate the target delivery date (Sehri date)
 * For "8th Feb Sehri", window is: 7th Feb 6AM → 8th Feb 6AM IST
 */
export async function getDeliveryWindow() {
    const config = await db.globalConfig.findUnique({ where: { id: "singleton" } });
    const now = DateTime.now().setZone("Asia/Kolkata");

    let targetDate: DateTime;

    const realTargetDate = now.hour >= 6
        ? now.plus({ days: 1 }).startOf("day")
        : now.startOf("day");

    if (config?.ramadanStarted) {
        const officialStart = config.officialStartDate
            ? DateTime.fromJSDate(config.officialStartDate).setZone("Asia/Kolkata").startOf("day")
            : null;

        // If it's already past the official start, use the real current target
        // Otherwise, stay on the official start date
        if (officialStart && realTargetDate < officialStart) {
            targetDate = officialStart;
        } else {
            targetDate = realTargetDate;
        }
    } else {
        // Onboarding phase: use official start date if set, otherwise Feb 18
        if (config?.officialStartDate) {
            targetDate = DateTime.fromJSDate(config.officialStartDate).setZone("Asia/Kolkata").startOf("day");
        } else {
            targetDate = DateTime.fromObject({ year: 2026, month: 2, day: 18 }, { zone: "Asia/Kolkata" }).startOf("day");
        }
    }

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
