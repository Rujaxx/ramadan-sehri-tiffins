"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row gap-4",
                month: "space-y-4 relative",
                month_caption: "flex justify-center pt-1 items-center mb-4",
                caption_label: "text-sm font-bold gradient-text",
                nav: "flex items-center justify-between absolute w-full px-2 top-1 z-10",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-muted/50 p-0 hover:bg-emerald-500/10 hover:text-emerald-400 border-none transition-all"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-muted/50 p-0 hover:bg-emerald-500/10 hover:text-emerald-400 border-none transition-all"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "mb-2",
                weekday: "text-muted-foreground rounded-md w-11 font-medium text-[0.75rem] uppercase text-center py-2",
                week: "w-full mt-1",
                day: "h-11 w-11 text-center text-sm p-0 relative [&:has([aria-selected].range-end)]:rounded-r-xl [&:has([aria-selected].outside)]:bg-accent/50 [&:has([aria-selected])]:bg-emerald-500/10 first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl focus-within:relative focus-within:z-20",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-11 w-11 p-0 font-normal aria-selected:opacity-100 rounded-xl hover:bg-emerald-500/20 transition-all !w-11 !h-11"
                ),
                range_end: "range-end",
                selected: "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-500 focus:text-white shadow-lg shadow-emerald-500/30",
                today: "bg-muted text-foreground font-bold border border-emerald-500/30",
                outside: "outside text-muted-foreground/30 aria-selected:bg-emerald-500/5 aria-selected:text-muted-foreground/30",
                disabled: "text-muted-foreground/20 opacity-50 cursor-not-allowed",
                range_middle: "aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ ...props }) => {
                    if (props.orientation === "left") {
                        return <ChevronLeft className="h-4 w-4" />
                    }
                    return <ChevronRight className="h-4 w-4" />
                },
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
