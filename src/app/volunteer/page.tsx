"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { VolunteerDeliveryPanel } from "@/components/volunteer/volunteer-delivery-panel";
import {
    Loader2,
    LogOut,
    User,
    ShieldCheck,
} from "lucide-react";

export default function VolunteerPage() {
    const { user, logout, isLoading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== "VOLUNTEER") {
                router.push("/login");
            }
        }
    }, [user, authLoading, router]);

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            {/* Header */}
            <header className="bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
                <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <ShieldCheck className="h-6 w-6 text-black" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black leading-none">Volunteer</h1>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2.5 rounded-2xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-xl mx-auto px-4 py-6">
                {/* Profile Card */}
                <div className="mb-8 p-4 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <User className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-bold text-white">{user.name}</h2>
                        <p className="text-xs text-zinc-500">Active Session</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Online</span>
                    </div>
                </div>

                <VolunteerDeliveryPanel />
            </main>

            {/* Bottom Nav Spacer */}
            <div className="h-10" />
        </div>
    );
}
