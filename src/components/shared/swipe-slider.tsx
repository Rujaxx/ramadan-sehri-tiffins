"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronRight } from "lucide-react";
import { motion, useMotionValue, useTransform } from "framer-motion";

interface SwipeSliderProps {
    onComplete: () => void;
    text?: string;
}

export function SwipeSlider({ onComplete, text = "Swipe to Complete" }: SwipeSliderProps) {
    const [complete, setComplete] = useState(false);
    const x = useMotionValue(0);
    const opacity = useTransform(x, [0, 150], [1, 0]);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleDragEnd = () => {
        if (x.get() > 180) {
            setComplete(true);
            onComplete();
        } else {
            x.set(0);
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative h-16 w-full bg-zinc-900 rounded-full border border-zinc-800 overflow-hidden flex items-center justify-center"
        >
            <motion.div style={{ opacity }} className="text-zinc-400 font-semibold flex items-center gap-2">
                {text} <ChevronRight className="h-4 w-4 animate-pulse" />
            </motion.div>

            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 240 }}
                style={{ x }}
                onDragEnd={handleDragEnd}
                className="absolute left-1 h-14 w-14 bg-emerald-500 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10 shadow-lg shadow-emerald-500/20"
            >
                {complete ? <Check className="text-white h-7 w-7" /> : <ChevronRight className="text-white h-7 w-7" />}
            </motion.div>

            <motion.div
                style={{ width: x }}
                className="absolute left-0 top-0 bottom-0 bg-emerald-500/20"
            />
        </div>
    );
}
