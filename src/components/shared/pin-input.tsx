"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface PinInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
}

export function PinInput({ length = 4, value, onChange }: PinInputProps) {
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (val: string, index: number) => {
        if (!/^\d*$/.test(val)) return;

        const newValue = value.split("");
        newValue[index] = val.slice(-1);
        const updatedValue = newValue.join("");
        onChange(updatedValue);

        if (val && index < length - 1) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === "Backspace" && !value[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length }).map((_, i) => (
                <Input
                    key={i}
                    ref={(el) => { inputs.current[i] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ""}
                    onChange={(e) => handleChange(e.target.value, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    className="w-14 h-16 text-center text-2xl font-bold bg-muted/50 border-2 focus:border-primary rounded-xl"
                />
            ))}
        </div>
    );
}
