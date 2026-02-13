import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({ success: true });

    // Clear the auth cookie using the idiomatic delete method
    response.cookies.delete("token");

    return response;
}
