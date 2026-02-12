"use client";

import { Phone, Navigation, Home, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SwipeSlider } from "@/components/shared/swipe-slider";
import { Badge } from "@/components/ui/badge";

interface DeliveryCardProps {
    id: string;
    name: string;
    address: string;
    landmark: string;
    tiffinCount: number;
    onMarkDelivered: (id: string) => void;
}

export function DeliveryCard({ id, name, address, landmark, tiffinCount, onMarkDelivered }: DeliveryCardProps) {
    return (
        <Card className="bg-zinc-950 border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h4 className="text-zinc-500 uppercase text-xs font-bold tracking-widest flex items-center gap-2">
                                <Home className="h-3 w-3" /> Address & Landmark
                            </h4>
                            <p className="text-2xl font-bold text-zinc-100">{address}</p>
                            <p className="text-xl font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg w-fit mt-2">
                                {landmark}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-2xl font-black px-4 py-2 border-zinc-700 bg-zinc-900 text-zinc-300">
                        {tiffinCount}
                    </Badge>
                </div>

                <div className="flex gap-4">
                    <Button
                        className="flex-1 h-14 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-800"
                        onClick={() => window.open(`tel:+1234567890`)} // In a real app, this would call the masking server
                    >
                        <Phone className="h-5 w-5 text-emerald-500" />
                        <span className="font-bold">Call User</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="w-14 h-14 bg-zinc-900 border-zinc-800 text-zinc-100 rounded-2xl flex items-center justify-center hover:bg-zinc-800"
                    >
                        <Navigation className="h-5 w-5 text-cyan-500" />
                    </Button>
                </div>

                <div className="pt-2">
                    <SwipeSlider onComplete={() => onMarkDelivered(id)} />
                </div>
            </CardContent>
        </Card>
    );
}
