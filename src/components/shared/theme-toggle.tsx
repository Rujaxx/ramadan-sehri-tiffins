"use client";

import { useTheme } from "@/context/theme-context";
import { Moon, Sun, Monitor } from "lucide-react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const cycle = () => {
        if (theme === "system") setTheme("light");
        else if (theme === "light") setTheme("dark");
        else setTheme("system");
    };

    return (
        <button
            onClick={cycle}
            aria-label={`Theme: ${theme}. Click to switch.`}
            title={`Theme: ${theme === "system" ? "System" : theme === "light" ? "Light" : "Dark"}`}
            className="fixed bottom-6 left-4 z-50 p-2.5 rounded-full bg-background/80 backdrop-blur-md border border-border shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
        >
            {theme === "system" ? (
                <Monitor className="h-5 w-5 text-blue-500" />
            ) : theme === "light" ? (
                <Sun className="h-5 w-5 text-amber-500" />
            ) : (
                <Moon className="h-5 w-5 text-indigo-400" />
            )}
        </button>
    );
}
