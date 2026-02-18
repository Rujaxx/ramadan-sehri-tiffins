import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getDeliveryWindow } from "@/lib/delivery";
import { calculateEffectiveTiffins } from "@/lib/booking_utils";
import { phoneSchema, alternatePhoneSchema } from "@/lib/validations";


/**
 * GET: List all bookings for the current delivery window
 * Includes user details, area, phone, address, tiffin count
 */
export async function GET(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const area = searchParams.get("area");
        const query = searchParams.get("query") || "";
        const status = searchParams.get("status") || "ACTIVE";
        const limit = parseInt(searchParams.get("limit") || "20");
        const cursor = searchParams.get("cursor");

        // Calculate target delivery date
        const { targetDate } = getDeliveryWindow();
        const targetDateStartJS = targetDate.startOf("day").toJSDate();
        const targetDateEndJS = targetDate.endOf("day").toJSDate();
        const dayAfterJS = targetDate.plus({ days: 1 }).startOf("day").toJSDate();
        // Build where clause
        const whereClause: any = {
            status: status,
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
                role: "USER",
                blocked: false,
                ...(area && { area }),
                ...(query && {
                    OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { phone: { contains: query, mode: "insensitive" } }
                    ]
                })
            }
        };

        const bookings = await db.booking.findMany({
            where: whereClause,
            take: limit + 1, // Fetch one extra to check if there's more
            cursor: cursor ? { id: cursor } : undefined,
            skip: cursor ? 1 : 0,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        alternatePhone: true,
                        area: true,
                        address: true,
                        landmark: true,
                        verified: true,
                        blocked: true,
                    }
                },
                modifications: {
                    where: {
                        date: {
                            gte: targetDateStartJS,
                            lt: dayAfterJS
                        }
                    }
                }
            },
            orderBy: [{ user: { area: "asc" } }, { id: "asc" }] // Cursor pagination requires unique stable sort
        });


        const hasNextPage = bookings.length > limit;
        const bookingsToReturn = hasNextPage ? bookings.slice(0, limit) : bookings;
        const nextCursor = hasNextPage ? bookingsToReturn[bookingsToReturn.length - 1].id : null;

        // Map to include effective tiffin count for today
        const enrichedBookings = bookingsToReturn.map(booking => {
            const mod = booking.modifications[0];
            const todayTiffinCount = calculateEffectiveTiffins(booking, mod, targetDate);

            return {
                id: booking.id,
                userId: booking.userId,
                user: booking.user,
                baseTiffinCount: booking.tiffinCount,
                todayTiffinCount: todayTiffinCount,
                isCancelledToday: mod?.cancelled || false,
                modificationReason: mod?.reason || null,
                startDate: booking.startDate,
                endDate: booking.endDate,
                status: booking.status,
                type: booking.type,
                createdAt: booking.createdAt,
            };
        });

        // Get areas for filter dropdown (if it's the first page)
        let areaList: { name: string, count: number }[] = [];
        if (!cursor) {
            const areaWiseBookings = await db.booking.findMany({
                where: whereClause,
                select: {
                    user: {
                        select: {
                            area: true
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
                    startDate: true,
                    endDate: true,
                    type: true,
                    tiffinCount: true,
                }
            });
            const mappAreaWiseCount = new Map()
            areaWiseBookings.forEach(booking => {
                const mod = booking.modifications[0];
                const todayTiffinCount = calculateEffectiveTiffins(booking, mod, targetDate);
                mappAreaWiseCount.set(booking.user.area, (mappAreaWiseCount.get(booking.user.area) || 0) + todayTiffinCount);
            });
            const dbAreas = await db.area.findMany({ select: { name: true } });
            areaList = dbAreas.map(a => {
                const count = mappAreaWiseCount.get(a.name) || 0;
                return { name: a.name, count };
            });
        }

        return NextResponse.json({
            bookings: enrichedBookings,
            nextCursor,
            areas: areaList,
            targetDate: targetDate.toFormat("yyyy-MM-dd"),
            displayLabel: `Sehri for ${targetDate.toFormat("LLL d")}`,
        });

    } catch (error) {
        console.error("Fetch bookings error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * POST: Create new booking (admin adding order manually)
 * Can create new user if phone doesn't exist
 */
export async function POST(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { phone, name, address, landmark, area, pin, tiffinCount, startDate, endDate, alternatePhone } = body;

        if (!phone || !name || !address || !area || !tiffinCount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Validate phone
        const phoneValidation = phoneSchema.safeParse(phone);
        if (!phoneValidation.success) {
            return NextResponse.json({ error: phoneValidation.error.issues[0].message }, { status: 400 });
        }

        // Validate alternate phone
        if (alternatePhone) {
            const altPhoneValidation = alternatePhoneSchema.safeParse(alternatePhone);
            if (!altPhoneValidation.success) {
                return NextResponse.json({ error: altPhoneValidation.error.issues[0].message }, { status: 400 });
            }
        }


        // Check if user exists
        let user = await db.user.findUnique({ where: { phone } });

        if (!user) {
            // Create new user
            user = await db.user.create({
                data: {
                    phone,
                    alternatePhone: alternatePhone || null,
                    name,
                    address,
                    landmark: landmark || "",
                    area,
                    pin: pin || "",
                    role: "USER",
                    verified: true, // Admin-created users are auto-verified
                }
            });
        }

        // Create booking
        const now = DateTime.now().setZone("Asia/Kolkata");
        const booking = await db.booking.create({
            data: {
                userId: user.id,
                tiffinCount: parseInt(tiffinCount),
                startDate: startDate ? new Date(startDate) : now.toJSDate(),
                endDate: endDate ? new Date(endDate) : now.plus({ days: 30 }).toJSDate(),
                status: "ACTIVE",
                type: "RECURRING",
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        area: true,
                        address: true,
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: "Booking created successfully",
            booking,
            isNewUser: !user.createdAt || user.createdAt > new Date(Date.now() - 5000)
        });

    } catch (error) {
        console.error("Create booking error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * PATCH: Edit booking (change tiffin count, cancel for specific date or entire booking)
 */
export async function PATCH(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { bookingId, action, tiffinCount, date, reason } = body;

        if (!bookingId || !action) {
            return NextResponse.json({ error: "Booking ID and action required" }, { status: 400 });
        }

        const booking = await db.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        switch (action) {
            case "updateTiffins":
                // Update base tiffin count
                await db.booking.update({
                    where: { id: bookingId },
                    data: { tiffinCount: parseInt(tiffinCount) }
                });
                break;

            case "cancelToday":
                // Cancel for specific date (creates modification)
                const { targetDate: targetDateCancel } = getDeliveryWindow();

                await db.bookingModification.upsert({
                    where: {
                        bookingId_date: {
                            bookingId,
                            date: targetDateCancel.toJSDate()
                        }
                    },
                    update: { cancelled: true, reason: reason || "Cancelled by admin" },
                    create: {
                        bookingId,
                        date: targetDateCancel.toJSDate(),
                        cancelled: true,
                        reason: reason || "Cancelled by admin"
                    }
                });
                break;

            case "cancelBooking":
                // Cancel entire booking
                await db.booking.update({
                    where: { id: bookingId },
                    data: { status: "CANCELLED" }
                });
                break;

            case "restoreToday":
                // Remove cancellation for specific date
                const { targetDate: restoreDate } = getDeliveryWindow();

                await db.bookingModification.deleteMany({
                    where: {
                        bookingId,
                        date: restoreDate.toJSDate()
                    }
                });
                break;

            case "modifyTodayCount":
                // Change tiffin count for specific date only
                const { targetDate: modDate } = getDeliveryWindow();

                await db.bookingModification.upsert({
                    where: {
                        bookingId_date: {
                            bookingId,
                            date: modDate.toJSDate()
                        }
                    },
                    update: { tiffinCount: parseInt(tiffinCount), cancelled: false },
                    create: {
                        bookingId,
                        date: modDate.toJSDate(),
                        tiffinCount: parseInt(tiffinCount),
                        cancelled: false
                    }
                });
                break;

            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `Booking ${action} completed` });

    } catch (error) {
        console.error("Update booking error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
