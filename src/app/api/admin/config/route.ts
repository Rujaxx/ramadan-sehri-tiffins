import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET: Fetch current global configuration (Admin only version)
export async function GET(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const config = await db.globalConfig.findUnique({
            where: { id: "singleton" }
        });

        return NextResponse.json(config || {
            ramadanStarted: false,
            officialStartDate: null
        });
    } catch (error) {
        console.error("Error fetching admin config:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Update global configuration (Admin only)
export async function POST(req: Request) {
    try {
        const auth = await authorizeUser(req);
        if (!auth || auth.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { ramadanStarted, ramadanEnded, officialStartDate } = body;

        const result = await db.$transaction(async (tx) => {
            // 1. Get current config to check for date change
            const oldConfig = await tx.globalConfig.findUnique({
                where: { id: "singleton" }
            });

            // 2. Update config
            const config = await tx.globalConfig.upsert({
                where: { id: "singleton" },
                update: {
                    ramadanStarted: ramadanStarted ?? undefined,
                    ramadanEnded: ramadanEnded ?? undefined,
                    officialStartDate: officialStartDate ? new Date(officialStartDate) : undefined,
                },
                create: {
                    id: "singleton",
                    ramadanStarted: ramadanStarted ?? false,
                    ramadanEnded: ramadanEnded ?? false,
                    officialStartDate: officialStartDate ? new Date(officialStartDate) : null,
                }
            });

            // 3. If start date changed, update all RECURRING bookings
            if (officialStartDate) {
                const newStartDate = new Date(officialStartDate);
                const oldStartDate = oldConfig?.officialStartDate;

                if (!oldStartDate || newStartDate.getTime() !== oldStartDate.getTime()) {
                    // Update all recurring bookings to start on the new date
                    await tx.booking.updateMany({
                        where: {
                            type: "RECURRING",
                            status: "ACTIVE"
                        },
                        data: {
                            startDate: newStartDate
                        }
                    });

                    // Note: We might also want to shift endDate, but for now 
                    // we stick to the user's specific request about startDate.
                }
            }

            return config;
        });

        return NextResponse.json({
            success: true,
            config: result,
            message: "Configuration updated and recurring bookings synced"
        });
    } catch (error) {
        console.error("Error updating global config:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
