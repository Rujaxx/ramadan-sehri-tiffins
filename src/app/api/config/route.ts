import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// GET: Fetch current global configuration (Public)
export async function GET() {
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
