import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        status: 'online',
        message: 'Sehri Tiffin API is Live',
        cutoff: '20:00',
    });
}
