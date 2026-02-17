import { DateTime } from "luxon";

interface Booking {
    type: "ONE_TIME" | "RECURRING";
    tiffinCount: number;
    startDate: Date;
    endDate: Date;
}

interface Modification {
    tiffinCount: number | null;
    cancelled: boolean;
}

/**
 * Calculates the effective tiffin count for a booking on a specific target date.
 * Handles recurring vs one-time logic and modifications.
 */
export function calculateEffectiveTiffins(
    booking: Booking | { tiffinCount: number, startDate: Date, endDate: Date, type: "ONE_TIME" | "RECURRING" },
    mod: Modification | undefined,
    targetDate: DateTime
): number {
    if (mod) {
        if (mod.cancelled) {
            return 0;
        }
        if (mod.tiffinCount !== null && mod.tiffinCount !== undefined) {
            return mod.tiffinCount;
        }
        // Fall through to default logic if tiffinCount is null
    }

    if (booking.type === "RECURRING") {
        return booking.tiffinCount;
    }

    // For ONE_TIME, check if targetDate is within the booking range
    // Normalize dates to start of day for accurate comparison
    const bookingStart = DateTime.fromJSDate(booking.startDate).setZone("Asia/Kolkata").startOf("day");
    const bookingEnd = DateTime.fromJSDate(booking.endDate).setZone("Asia/Kolkata").startOf("day");
    const target = targetDate.setZone("Asia/Kolkata").startOf("day");

    if (target >= bookingStart && target <= bookingEnd) {
        return booking.tiffinCount;
    }

    return 0;
}
