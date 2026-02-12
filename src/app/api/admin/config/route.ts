import { db } from "@/lib/db";
import { authorizeUser } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET: Fetch current global configuration
export async function GET(req: Request) {
    try {
        const config = await db.globalConfig.findUnique({
            where: { id: "singleton" }
        });

        return NextResponse.json(config || {
            ramadanStarted: false,
            officialStartDate: null
        });
    } catch (error) {
        console.error("Error fetching global config:", error);
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

        const config = await db.globalConfig.upsert({
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

        return NextResponse.json({
            success: true,
            config,
            message: "Configuration updated successfully"
        });
    } catch (error) {
        console.error("Error updating global config:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
