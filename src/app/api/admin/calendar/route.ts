import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { calculateEffectiveTiffins } from "@/lib/booking_utils";
import { RAMADAN_START_DATE, RAMADAN_END_DATE } from "@/lib/constants";

/**
 * GET /api/admin/calendar
 * Returns daily tiffin counts for a given month within the Ramadan window.
 * Query params:
 *   - month: "YYYY-MM" (defaults to current month in IST)
 */
export async function GET(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const monthParam = searchParams.get("month");

        // Determine the target month
        const now = DateTime.now().setZone("Asia/Kolkata");
        let targetMonth: DateTime;
        if (monthParam) {
            const parsed = DateTime.fromFormat(monthParam, "yyyy-MM", { zone: "Asia/Kolkata" });
            targetMonth = parsed.isValid ? parsed.startOf("month") : now.startOf("month");
        } else {
            targetMonth = now.startOf("month");
        }

        // Ramadan boundaries
        const ramadanStart = DateTime.fromFormat(RAMADAN_START_DATE, "yyyy-MM-dd", { zone: "Asia/Kolkata" }).startOf("day");
        const ramadanEnd = DateTime.fromFormat(RAMADAN_END_DATE, "yyyy-MM-dd", { zone: "Asia/Kolkata" }).startOf("day");

        // Get officialStartDate from GlobalConfig if available
        const config = await db.globalConfig.findUnique({ where: { id: "singleton" } });
        const effectiveStart = config?.officialStartDate
            ? DateTime.fromJSDate(config.officialStartDate).setZone("Asia/Kolkata").startOf("day")
            : ramadanStart;

        // Clamp iteration range to the month, but only days within Ramadan window
        const monthStart = targetMonth.startOf("month");
        const monthEnd = targetMonth.endOf("month").startOf("day");
        const iterStart = monthStart > effectiveStart ? monthStart : effectiveStart;
        const iterEnd = monthEnd < ramadanEnd ? monthEnd : ramadanEnd;

        // If the month has no overlap with Ramadan, return empty
        if (iterStart > ramadanEnd || iterEnd < effectiveStart) {
            return NextResponse.json({
                days: [],
                month: targetMonth.toFormat("yyyy-MM"),
                ramadanStart: effectiveStart.toFormat("yyyy-MM-dd"),
                ramadanEnd: ramadanEnd.toFormat("yyyy-MM-dd"),
            });
        }

        // Fetch all ACTIVE bookings that could overlap with this month
        const monthStartJS = iterStart.toJSDate();
        const monthEndJS = iterEnd.endOf("day").toJSDate();

        const bookings = await db.booking.findMany({
            where: {
                status: "ACTIVE",
                startDate: { lte: monthEndJS },
                endDate: { gte: monthStartJS },
                user: { role: "USER" },
            },
            include: {
                user: { select: { area: true } },
                modifications: {
                    where: {
                        date: {
                            gte: monthStartJS,
                            lte: monthEndJS,
                        },
                    },
                },
            },
        });

        // Also fetch bookings that have modifications in this range but might be outside the date range
        const modBookings = await db.booking.findMany({
            where: {
                status: "ACTIVE",
                user: { role: "USER" },
                modifications: {
                    some: {
                        date: {
                            gte: monthStartJS,
                            lte: monthEndJS,
                        },
                    },
                },
                NOT: {
                    AND: [
                        { startDate: { lte: monthEndJS } },
                        { endDate: { gte: monthStartJS } },
                    ],
                },
            },
            include: {
                user: { select: { area: true } },
                modifications: {
                    where: {
                        date: {
                            gte: monthStartJS,
                            lte: monthEndJS,
                        },
                    },
                },
            },
        });

        const allBookings = [...bookings, ...modBookings];

        // Build a modification lookup map: bookingId -> { dateKey -> mod }
        const modMap = new Map<string, Map<string, { tiffinCount: number | null; cancelled: boolean }>>();
        allBookings.forEach(b => {
            const dateMap = new Map<string, { tiffinCount: number | null; cancelled: boolean }>();
            b.modifications.forEach(m => {
                const key = DateTime.fromJSDate(m.date).setZone("Asia/Kolkata").startOf("day").toFormat("yyyy-MM-dd");
                dateMap.set(key, { tiffinCount: m.tiffinCount, cancelled: m.cancelled });
            });
            modMap.set(b.id, dateMap);
        });

        // Get all areas for consistent ordering
        const areas = await db.area.findMany({ select: { name: true }, orderBy: { name: "asc" } });

        // Iterate day by day
        const days: {
            date: string;
            label: string;
            tiffins: number;
            areaBreakdown: { area: string; count: number }[];
        }[] = [];

        let cursor = iterStart;
        while (cursor <= iterEnd) {
            const dateKey = cursor.toFormat("yyyy-MM-dd");
            const dayStart = cursor.startOf("day");
            const dayEnd = cursor.endOf("day");

            // Per-area count
            const areaCount = new Map<string, number>();
            areas.forEach(a => areaCount.set(a.name, 0));

            let totalTiffins = 0;

            allBookings.forEach(booking => {
                const bookingStart = DateTime.fromJSDate(booking.startDate).setZone("Asia/Kolkata").startOf("day");
                const bookingEnd = DateTime.fromJSDate(booking.endDate).setZone("Asia/Kolkata").startOf("day");

                // Check if this booking covers this day (or has a mod for this day)
                const coversDay = dayStart >= bookingStart && dayStart <= bookingEnd;
                const bookingMods = modMap.get(booking.id);
                const mod = bookingMods?.get(dateKey);
                const hasModForDay = !!mod;

                if (!coversDay && !hasModForDay) return;

                const effectiveCount = calculateEffectiveTiffins(
                    {
                        tiffinCount: booking.tiffinCount,
                        startDate: booking.startDate,
                        endDate: booking.endDate,
                        type: booking.type as "ONE_TIME" | "RECURRING",
                    },
                    mod || undefined,
                    cursor
                );

                totalTiffins += effectiveCount;
                const area = booking.user.area;
                areaCount.set(area, (areaCount.get(area) || 0) + effectiveCount);
            });

            days.push({
                date: dateKey,
                label: cursor.toFormat("d LLL"),
                tiffins: totalTiffins,
                areaBreakdown: areas
                    .map(a => ({ area: a.name, count: areaCount.get(a.name) || 0 }))
                    .filter(a => a.count > 0),
            });

            cursor = cursor.plus({ days: 1 });
        }

        return NextResponse.json({
            days,
            month: targetMonth.toFormat("yyyy-MM"),
            ramadanStart: effectiveStart.toFormat("yyyy-MM-dd"),
            ramadanEnd: ramadanEnd.toFormat("yyyy-MM-dd"),
        });

    } catch (error) {
        console.error("Calendar API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
