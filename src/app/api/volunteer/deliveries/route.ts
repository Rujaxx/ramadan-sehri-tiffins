import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getDeliveryWindow } from "@/lib/delivery";
import { DateTime } from "luxon";
import { calculateEffectiveTiffins } from "@/lib/booking_utils";

/**
 * GET: List all bookings assigned to the volunteer's areas for the current delivery window
 */
export async function GET(req: Request) {
    try {
        const user = await authorizeUser(req);
        if (!user || user.role !== "VOLUNTEER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const volunteer = await db.volunteer.findUnique({
            where: { userId: user.id }
        });

        if (!volunteer) {
            return NextResponse.json({ error: "Volunteer profile not found" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20");
        const cursor = searchParams.get("cursor");
        const status = searchParams.get("status") || "ALL"; // ALL, PENDING, DELIVERED
        const query = searchParams.get("query") || "";
        const area = searchParams.get("area");

        if (area && !volunteer.areas.includes(area)) {
            return NextResponse.json({ error: "Unauthorized area access" }, { status: 403 });
        }

        const { targetDate, windowStart, windowEnd } = getDeliveryWindow();
        const targetDateStartJS = targetDate.startOf("day").toJSDate();
        const targetDateEndJS = targetDate.endOf("day").toJSDate();
        const dayAfterJS = targetDate.plus({ days: 1 }).startOf("day").toJSDate();
        const windowStartJS = windowStart.toJSDate();
        const windowEndJS = windowEnd.toJSDate();

        // 1. Fetch bookings in volunteer's areas
        const whereClause: any = {
            status: "ACTIVE",
            OR: [
                {
                    startDate: { lte: targetDateEndJS },
                    endDate: { gte: targetDateStartJS }
                },
                {
                    modifications: {
                        some: {
                            date: {
                                gte: targetDateStartJS,
                                lt: dayAfterJS
                            }
                        }
                    }
                }
            ],
            user: {
                area: area ? area : { in: volunteer.areas },
                ...(query.length > 0 && {
                    OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { phone: { contains: query, mode: "insensitive" } },
                        { address: { contains: query, mode: "insensitive" } }
                    ]
                })
            }
        };
        // If filtering by DELIVERED status, use relation filter for correct pagination
        if (status === "DELIVERED") {
            whereClause.deliveries = {
                some: {
                    deliveredAt: {
                        gte: windowStartJS,
                        lt: windowEndJS
                    }
                }
            };
            // Exclude cancelled bookings from showing as delivered
            whereClause.modifications = {
                none: {
                    date: {
                        gte: targetDateStartJS,
                        lt: dayAfterJS
                    },
                    cancelled: true
                }
            };
        } else if (status === "PENDING") {
            // Filter out delivered AND cancelled bookings at DB level for correct pagination
            whereClause.deliveries = {
                none: {
                    deliveredAt: {
                        gte: windowStartJS,
                        lt: windowEndJS
                    }
                }
            };
            whereClause.modifications = {
                none: {
                    date: {
                        gte: targetDate,
                        lt: dayAfterJS
                    },
                    cancelled: true
                }
            };
        }

        const bookings = await db.booking.findMany({
            where: whereClause,
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
            include: {
                user: {
                    select: {
                        name: true,
                        phone: true,
                        alternatePhone: true,
                        area: true,
                        address: true,
                        landmark: true,
                        verified: true,
                    }
                },
                modifications: {
                    where: {
                        date: {
                            gte: targetDateStartJS,
                            lt: dayAfterJS
                        }
                    }
                },
                deliveries: {
                    where: {
                        deliveredAt: {
                            gte: windowStartJS,
                            lt: windowEndJS
                        }
                    }
                }
            },
            orderBy: { user: { area: "asc" } }
        });
        const hasNextPage = bookings.length > limit;
        const bookingsToReturn = hasNextPage ? bookings.slice(0, limit) : bookings;
        const nextCursor = hasNextPage ? bookingsToReturn[bookingsToReturn.length - 1].id : null;

        // 2. Map results
        const enriched = bookingsToReturn.map(booking => {
            const mod = booking.modifications[0];
            const isDelivered = booking.deliveries.length > 0;
            const isCancelled = mod?.cancelled || false;

            return {
                id: booking.id,
                user: {
                    ...booking.user,
                    verified: booking.user.verified
                },
                tiffinCount: calculateEffectiveTiffins(booking, mod, targetDate),
                isCancelled,
                isDelivered,
                deliveredAt: isDelivered ? booking.deliveries[0].deliveredAt : null,
            };
        });

        // 3. Area-wise summary for volunteer (if it's the first page)
        let areaList: { name: string, count: number }[] = [];
        if (!cursor) {
            const areaBookings = await db.booking.findMany({
                where: {
                    ...whereClause,
                    // We use same whereClause to match the statistics shown in Admin panel logic
                },
                select: {
                    user: { select: { area: true } },
                    tiffinCount: true,
                    startDate: true,
                    endDate: true,
                    modifications: {
                        where: {
                            date: {
                                gte: targetDateStartJS,
                                lt: dayAfterJS
                            }
                        }
                    }
                }
            });

            const mappAreaWiseCount = new Map();
            areaBookings.forEach(booking => {
                const mod = booking.modifications[0];
                const count = calculateEffectiveTiffins(booking as any, mod, targetDate);
                mappAreaWiseCount.set(booking.user.area, (mappAreaWiseCount.get(booking.user.area) || 0) + count);
            });

            areaList = volunteer.areas.map(name => ({
                name,
                count: mappAreaWiseCount.get(name) || 0
            }));
        }

        return NextResponse.json({
            deliveries: enriched,
            nextCursor,
            areas: areaList,
            displayLabel: `Sehri for ${targetDate.toFormat("LLL d")}`,
            targetDate: targetDate.toFormat("yyyy-MM-dd"),
        });

    } catch (error) {
        console.error("Fetch volunteer deliveries error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST: Mark a booking as delivered
 */
export async function POST(req: Request) {
    try {
        const user = await authorizeUser(req);
        if (!user || user.role !== "VOLUNTEER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const volunteer = await db.volunteer.findUnique({
            where: { userId: user.id }
        });

        if (!volunteer) {
            return NextResponse.json({ error: "Volunteer profile not found" }, { status: 404 });
        }

        const body = await req.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
        }

        // Verify booking exists and belongs to volunteer's areas
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: { user: { select: { area: true } } }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        if (!volunteer.areas.includes(booking.user.area)) {
            return NextResponse.json({ error: "Booking is not in your assigned areas" }, { status: 403 });
        }

        const { windowStart, windowEnd } = getDeliveryWindow();
        const windowStartJS = windowStart.toJSDate();
        const windowEndJS = windowEnd.toJSDate();
        const now = DateTime.now().setZone("Asia/Kolkata");

        // Prevent marking deliveries outside the delivery window
        if (now < windowStart || now >= windowEnd) {
            return NextResponse.json(
                { error: `Delivery window is ${windowStart.toFormat("LLL d h:mm a")} to ${windowEnd.toFormat("LLL d h:mm a")}` },
                { status: 400 }
            );
        }

        // Check if already delivered in this window
        const existing = await db.delivery.findFirst({
            where: {
                bookingId,
                deliveredAt: {
                    gte: windowStartJS,
                    lt: windowEndJS
                }
            }
        });

        if (existing) {
            return NextResponse.json({ error: "Already marked as delivered" }, { status: 400 });
        }

        const delivery = await db.delivery.create({
            data: {
                bookingId,
                volunteerId: volunteer.id,
                status: "DELIVERED",
                deliveredAt: new Date(),
            }
        });

        return NextResponse.json({
            success: true,
            message: "Marked as delivered",
            delivery
        });

    } catch (error) {
        console.error("Mark delivered error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * DELETE: Undo a delivery (remove record)
 */
export async function DELETE(req: Request) {
    try {
        const user = await authorizeUser(req);
        if (!user || user.role !== "VOLUNTEER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const volunteer = await db.volunteer.findUnique({
            where: { userId: user.id }
        });

        if (!volunteer) {
            return NextResponse.json({ error: "Volunteer profile not found" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const bookingId = searchParams.get("bookingId");

        if (!bookingId) {
            return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
        }

        // Verify booking belongs to volunteer's areas
        const booking = await db.booking.findUnique({
            where: { id: bookingId },
            include: { user: { select: { area: true } } }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        if (!volunteer.areas.includes(booking.user.area)) {
            return NextResponse.json({ error: "Booking is not in your assigned areas" }, { status: 403 });
        }

        const { windowStart, windowEnd } = getDeliveryWindow();

        // Delete any delivery records for this booking in the current window
        await db.delivery.deleteMany({
            where: {
                bookingId,
                deliveredAt: {
                    gte: windowStart.toJSDate(),
                    lt: windowEnd.toJSDate()
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: "Delivery undone"
        });

    } catch (error) {
        console.error("Undo delivery error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
