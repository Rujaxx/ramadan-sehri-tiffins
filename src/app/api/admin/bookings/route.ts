import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
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
        const config = await db.globalConfig.findUnique({ where: { id: "singleton" } });
        const now = DateTime.now().setZone("Asia/Kolkata");

        const realTargetDate = now.hour >= 6
            ? now.plus({ days: 1 }).startOf("day")
            : now.startOf("day");

        let targetDate: DateTime;
        if (config?.ramadanStarted) {
            const officialStart = config.officialStartDate
                ? DateTime.fromJSDate(config.officialStartDate).setZone("Asia/Kolkata").startOf("day")
                : null;

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

        const targetDateJS = targetDate.toJSDate();
        const dayAfterJS = targetDate.plus({ days: 1 }).toJSDate();

        // Build where clause
        const whereClause: any = {
            status: status,
            OR: [
                {
                    startDate: { lte: targetDateJS },
                    endDate: { gte: targetDateJS }
                },
                {
                    modifications: {
                        some: {
                            date: {
                                gte: targetDateJS,
                                lt: dayAfterJS
                            }
                        }
                    }
                }
            ],
            user: {
                role: "USER",
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
                            gte: targetDateJS,
                            lt: dayAfterJS
                        }
                    }
                }
            },
            orderBy: { id: "asc" } // Cursor pagination requires stable sort
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
        let areaList: string[] = [];
        if (!cursor) {
            const dbAreas = await db.area.findMany({ select: { name: true } });
            areaList = dbAreas.map(a => a.name);
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
                const configCancel = await db.globalConfig.findUnique({ where: { id: "singleton" } });
                const nowCancel = DateTime.now().setZone("Asia/Kolkata");

                const realTargetDateCancel = nowCancel.hour >= 6
                    ? nowCancel.plus({ days: 1 }).startOf("day")
                    : nowCancel.startOf("day");

                let targetDateCancel: DateTime;
                if (configCancel?.ramadanStarted) {
                    const officialStart = configCancel.officialStartDate
                        ? DateTime.fromJSDate(configCancel.officialStartDate).setZone("Asia/Kolkata").startOf("day")
                        : null;

                    if (officialStart && realTargetDateCancel < officialStart) {
                        targetDateCancel = officialStart;
                    } else {
                        targetDateCancel = realTargetDateCancel;
                    }
                } else {
                    // Onboarding phase
                    if (configCancel?.officialStartDate) {
                        targetDateCancel = DateTime.fromJSDate(configCancel.officialStartDate).setZone("Asia/Kolkata").startOf("day");
                    } else {
                        targetDateCancel = DateTime.fromObject({ year: 2026, month: 2, day: 18 }, { zone: "Asia/Kolkata" }).startOf("day");
                    }
                }

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
                const configRestore = await db.globalConfig.findUnique({ where: { id: "singleton" } });
                const nowRestore = DateTime.now().setZone("Asia/Kolkata");

                const realRestoreDate = nowRestore.hour >= 6
                    ? nowRestore.plus({ days: 1 }).startOf("day")
                    : nowRestore.startOf("day");

                let restoreDate: DateTime;
                if (configRestore?.ramadanStarted) {
                    const officialStart = configRestore.officialStartDate
                        ? DateTime.fromJSDate(configRestore.officialStartDate).setZone("Asia/Kolkata").startOf("day")
                        : null;

                    if (officialStart && realRestoreDate < officialStart) {
                        restoreDate = officialStart;
                    } else {
                        restoreDate = realRestoreDate;
                    }
                } else {
                    // Onboarding phase
                    if (configRestore?.officialStartDate) {
                        restoreDate = DateTime.fromJSDate(configRestore.officialStartDate).setZone("Asia/Kolkata").startOf("day");
                    } else {
                        restoreDate = DateTime.fromObject({ year: 2026, month: 2, day: 18 }, { zone: "Asia/Kolkata" }).startOf("day");
                    }
                }

                await db.bookingModification.deleteMany({
                    where: {
                        bookingId,
                        date: restoreDate.toJSDate()
                    }
                });
                break;

            case "modifyTodayCount":
                // Change tiffin count for specific date only
                const configMod = await db.globalConfig.findUnique({ where: { id: "singleton" } });
                const nowMod = DateTime.now().setZone("Asia/Kolkata");

                const realModDate = nowMod.hour >= 6
                    ? nowMod.plus({ days: 1 }).startOf("day")
                    : nowMod.startOf("day");

                let modDate: DateTime;
                if (configMod?.ramadanStarted) {
                    const officialStart = configMod.officialStartDate
                        ? DateTime.fromJSDate(configMod.officialStartDate).setZone("Asia/Kolkata").startOf("day")
                        : null;

                    if (officialStart && realModDate < officialStart) {
                        modDate = officialStart;
                    } else {
                        modDate = realModDate;
                    }
                } else {
                    // Onboarding phase
                    if (configMod?.officialStartDate) {
                        modDate = DateTime.fromJSDate(configMod.officialStartDate).setZone("Asia/Kolkata").startOf("day");
                    } else {
                        modDate = DateTime.fromObject({ year: 2026, month: 2, day: 18 }, { zone: "Asia/Kolkata" }).startOf("day");
                    }
                }

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
