"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
}

export function Stepper({ value, onChange, min = 1, max = 10 }: StepperProps) {
    return (
        <div className="flex items-center gap-4 bg-muted/50 p-2 rounded-xl w-fit">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-lg bg-background hover:bg-background/80 shadow-sm"
                onClick={() => value > min && onChange(value - 1)}
                disabled={value <= min}
            >
                <Minus className="h-6 w-6" />
            </Button>

            <span className="text-2xl font-bold w-12 text-center">{value}</span>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-lg bg-background hover:bg-background/80 shadow-sm"
                onClick={() => value < max && onChange(value + 1)}
                disabled={value >= max}
            >
                <Plus className="h-6 w-6" />
            </Button>
        </div>
    );
}
