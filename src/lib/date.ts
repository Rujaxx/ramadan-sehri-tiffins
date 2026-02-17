import { DateTime } from "luxon";
import { RAMADAN_START_DATE, RAMADAN_END_DATE } from "./constants";

export type SeasonStatus = "PRE_SEASON" | "ACTIVE" | "POST_SEASON";

export interface GlobalConfig {
    ramadanStarted: boolean;
    ramadanEnded: boolean;
    officialStartDate: string | Date | null;
}

/**
 * Parses a YYYY-MM-DD string as a local date (midnight).
 * This prevents UTC offset issues (e.g., IST is UTC+5:30).
 */
export function parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
}

export function getSeasonStatus(config?: GlobalConfig): SeasonStatus {
    // Check for test mode
    if (process.env.NEXT_PUBLIC_TEST_MODE === "true") {
        return "ACTIVE";
    }

    if (config?.ramadanEnded) {
        return "POST_SEASON";
    }

    if (config?.ramadanStarted) {
        return "ACTIVE";
    }

    const now = DateTime.now().setZone("Asia/Kolkata");
    const today = now.startOf("day");

    let start: DateTime;
    if (config?.officialStartDate) {
        if (typeof config.officialStartDate === "string") {
            // Handle ISO string or YYYY-MM-DD
            start = DateTime.fromISO(config.officialStartDate.split('T')[0]).setZone("Asia/Kolkata").startOf("day");
        } else {
            start = DateTime.fromJSDate(config.officialStartDate).setZone("Asia/Kolkata").startOf("day");
        }
    } else {
        start = DateTime.fromFormat(RAMADAN_START_DATE, "yyyy-MM-dd", { zone: "Asia/Kolkata" }).startOf("day");
    }

    const end = DateTime.fromFormat(RAMADAN_END_DATE, "yyyy-MM-dd", { zone: "Asia/Kolkata" }).startOf("day");

    if (today < start) {
        return "PRE_SEASON";
    } else if (today > end) {
        return "POST_SEASON";
    } else {
        return "ACTIVE";
    }
}

/**
 * Returns the effective delivery date based on a 6:00 AM IST cutoff.
 * If current time is >= 6:00 AM, the target delivery is "Tomorrow".
 * If current time is < 6:00 AM, the target delivery is "Today".
 */
export function getEffectiveDeliveryDate(nowISO?: string): DateTime {
    const now = nowISO
        ? DateTime.fromISO(nowISO, { zone: "Asia/Kolkata" })
        : DateTime.now().setZone("Asia/Kolkata");

    // If it's 6:00 AM or later, we are looking at the delivery for the NEXT morning (Sehri).
    if (now.hour >= 6) {
        return now.plus({ days: 1 }).startOf("day");
    }

    // If it's before 6:00 AM, we are still within the "Current" delivery window (Sehri of today).
    return now.startOf("day");
}

export function getNextDeliveryLabel(status: SeasonStatus, config?: GlobalConfig): string {
    switch (status) {
        case "PRE_SEASON":
            let displayDate = "Feb 18";
            if (config?.officialStartDate) {
                const dateObj = typeof config.officialStartDate === "string"
                    ? new Date(config.officialStartDate)
                    : config.officialStartDate;
                displayDate = dateObj.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
            }
            return `Starts ${displayDate}`;
        case "ACTIVE":
            return "Tomorrow";
        case "POST_SEASON":
            return "Ended";
        default:
            return "Tomorrow";
    }
}
