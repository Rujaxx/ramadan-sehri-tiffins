import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getDeliveryWindow } from "@/lib/delivery";
import { calculateEffectiveTiffins } from "@/lib/booking_utils";

export async function GET(req: Request) {
    try {
        const user = await authorizeUser(req);
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { targetDate, windowStart, windowEnd, displayLabel, displayDate } = await getDeliveryWindow();
        const windowStartJS = windowStart.toJSDate();
        const windowEndJS = windowEnd.toJSDate();

        // 1. User counts
        const activeUsersCount = await db.user.count({
            where: { role: "USER" }
        });

        const unverifiedUsersCount = await db.user.count({
            where: { role: "USER", verified: false }
        });

        const unverifiedUsers = await db.user.findMany({
            where: { role: "USER", verified: false },
            include: {
                bookings: {
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            },
            orderBy: { createdAt: "desc" },
            take: 50
        });

        const volunteerCount = await db.volunteer.count();

        // 2. Get all areas
        const areas = await db.area.findMany();

        // 3. Get volunteers with their area assignments
        const volunteers = await db.volunteer.findMany({
            include: {
                user: { select: { name: true } }
            }
        });

        // Create a map of area -> volunteer names
        const areaVolunteersMap: Record<string, string[]> = {};
        volunteers.forEach(v => {
            v.areas.forEach(areaName => {
                if (!areaVolunteersMap[areaName]) {
                    areaVolunteersMap[areaName] = [];
                }
                areaVolunteersMap[areaName].push(v.user.name);
            });
        });

        // 4. Calculate tiffins per area for the target delivery date
        let totalTiffinsToday = 0;
        let todayCancellations = 0;

        const areaBreakdown = await Promise.all(areas.map(async (area) => {
            // Get all users in this area with active bookings covering the target date
            const areaUsers = await db.user.findMany({
                where: { area: area.name, role: "USER" },
                include: {
                    bookings: {
                        where: {
                            status: "ACTIVE",
                            OR: [
                                {
                                    startDate: { lte: windowEndJS },
                                    endDate: { gte: windowStartJS }
                                },
                                {
                                    modifications: {
                                        some: {
                                            date: {
                                                gte: targetDate.startOf("day").toJSDate(),
                                                lt: targetDate.plus({ days: 1 }).startOf("day").toJSDate()
                                            }
                                        }
                                    }
                                }
                            ]
                        },
                        include: {
                            modifications: {
                                where: {
                                    date: {
                                        gte: targetDate.startOf("day").toJSDate(),
                                        lt: targetDate.plus({ days: 1 }).startOf("day").toJSDate()
                                    }
                                }
                            }
                        }
                    }
                }
            });

            let areaTiffins = 0;
            let areaCancellations = 0;

            areaUsers.forEach(user => {
                user.bookings.forEach(booking => {
                    const mod = booking.modifications[0];
                    const count = calculateEffectiveTiffins(booking, mod, targetDate);

                    if (mod?.cancelled) {
                        areaCancellations++;
                    }

                    areaTiffins += count;
                });
            });

            totalTiffinsToday += areaTiffins;
            todayCancellations += areaCancellations;

            // Count new users (created in last 24h)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const newUsersInArea = areaUsers.filter(u => u.createdAt > oneDayAgo).length;

            return {
                area: area.name,
                totalTiffins: areaTiffins,
                newUsers: newUsersInArea,
                volunteers: areaVolunteersMap[area.name] || []
            };
        }));

        return NextResponse.json({
            deliveryInfo: {
                displayLabel,
                displayDate,
                windowStart: windowStart.toISO(),
                windowEnd: windowEnd.toISO(),
            },
            stats: {
                totalTiffins: totalTiffinsToday,
                activeUsers: activeUsersCount,
                unverifiedUsers: unverifiedUsersCount,
                todayCancellations: todayCancellations,
                volunteerCount: volunteerCount,
                capacity: Math.min(Math.round((totalTiffinsToday / 500) * 100), 100),
                unverifiedList: unverifiedUsers.map(u => ({
                    id: u.id,
                    name: u.name,
                    phone: u.phone,
                    alternatePhone: u.alternatePhone,
                    area: u.area,
                    address: u.address,
                    landmark: u.landmark,
                    tiffinCount: u.bookings[0]?.tiffinCount || 0,
                    bookingType: u.bookings[0]?.type || 'N/A',
                    startDate: u.bookings[0]?.startDate,
                    endDate: u.bookings[0]?.endDate,
                }))
            },
            areaBreakdown
        });

    } catch (error) {
        console.error("Fetch admin stats error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
