import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const areas = await db.area.findMany({
            orderBy: {
                name: "asc",
            },
        });
        return NextResponse.json(areas);
    } catch (error) {
        console.error("Fetch areas error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
