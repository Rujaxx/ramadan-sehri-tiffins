"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stepper } from "@/components/shared/stepper";
import { PinInput } from "@/components/shared/pin-input";
import { RAMADAN_AREAS, RAMADAN_START_DATE, RAMADAN_END_DATE } from "@/lib/constants";
import { registrationSchema } from "@/lib/validations";
import { MapPin, Phone, User as UserIcon, Lock, Loader2, Calendar as CalendarIcon, CalendarRange, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Format date string (YYYY-MM-DD) to display format (e.g. "Feb 18, 2026")
function formatDateDisplay(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// Calculate number of days between two date strings
function getDaysBetween(startStr: string, endStr: string): number {
    const start = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T00:00:00");
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

const formSchema = registrationSchema;
const TOTAL_STEPS = 4;

// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</span>
                <span className="text-sm font-medium text-emerald-400">
                    {currentStep === 1 && "Your Info"}
                    {currentStep === 2 && "Delivery Address"}
                    {currentStep === 3 && "Booking Duration"}
                    {currentStep === 4 && "Final Details"}
                </span>
            </div>
            <div className="flex gap-2">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-all duration-300 ${i < currentStep
                            ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                            : "bg-muted/50"
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}

export function RegistrationForm() {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            phone: "",
            alternatePhone: "",
            area: "",
            address: "",
            landmark: "",
            tiffinCount: 1,
            pin: "",
            bookingType: "FULL_RAMADAN",
            startDate: "",
            endDate: "",
        },
    });

    const bookingType = form.watch("bookingType");

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        console.log("Submitting:", values);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const contentType = response.headers.get("content-type");
            let data;
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || "Server returned non-JSON response");
            }

            if (!response.ok) {
                throw new Error(data.error || "Something went wrong");
            }

            toast.success("Booking Successful!", {
                description: "Your Sehri tiffin has been booked. Redirecting to dashboard...",
            });

            if (data.token && data.user) {
                login(data.token, data.user);
            } else {
                router.push("/dashboard");
            }

        } catch (error: any) {
            console.error("Submission Error:", error);
            toast.error("Booking Failed", {
                description: error.message,
            });

            if (error.message.includes("Phone")) {
                setStep(1);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onError = (errors: any) => {
        console.log("Form Errors:", errors);
        if (errors.name || errors.phone) setStep(1);
        else if (errors.area || errors.address || errors.landmark) setStep(2);
        else if (errors.bookingType || errors.startDate || errors.endDate) setStep(3);
    };

    const nextStep = async () => {
        let fieldsToValidate: (keyof z.infer<typeof formSchema>)[] = [];
        if (step === 1) fieldsToValidate = ["name", "phone"];
        if (step === 2) fieldsToValidate = ["area", "address", "landmark"];
        if (step === 3) fieldsToValidate = ["bookingType"];

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            setStep((s) => s + 1);
        }
    };

    const prevStep = () => setStep((s) => s - 1);

    return (
        <Card className="premium-card w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="text-3xl font-bold gradient-text">Apna Naka Free Sehri Tiffin</CardTitle>
                <CardDescription>Get your Free Ramadan Sehri sorted in under a minute with Apna Naka.</CardDescription>
            </CardHeader>
            <CardContent>
                <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
                        {/* Step 1: Personal Info */}
                        {step === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <UserIcon className="h-4 w-4" /> Your Name
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Ahmed Khan" {...field} className="h-12 bg-muted/50 rounded-xl" />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Name as it should appear for delivery
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" /> Phone Number
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="9876543210" {...field} className="h-12 bg-muted/50 rounded-xl" />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                WhatsApp number preferred for delivery updates
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="alternatePhone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" /> Alternate Phone
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="Optional alternate number" {...field} className="h-12 bg-muted/50 rounded-xl" />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Backup contact number (optional)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" className="w-full h-12 rounded-xl" onClick={nextStep}>
                                    Continue →
                                </Button>
                                <div className="text-center pt-2">
                                    <p className="text-sm text-muted-foreground">
                                        Already have a booking?{" "}
                                        <button
                                            type="button"
                                            onClick={() => router.push("/login")}
                                            className="text-emerald-400 font-semibold hover:underline"
                                        >
                                            Login here
                                        </button>
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Address Info */}
                        {step === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <FormField
                                    control={form.control}
                                    name="area"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4" /> Delivery Area
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-12 bg-muted/50 rounded-xl">
                                                        <SelectValue placeholder="Select your area" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {RAMADAN_AREAS.map((area) => (
                                                        <SelectItem key={area} value={area}>{area}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription className="text-xs">
                                                Used to assign the right volunteer for your route
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Complete Address</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="House/Flat No., Building Name, Street..."
                                                    {...field}
                                                    className="bg-muted/50 rounded-xl min-h-[80px]"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Include house number, floor, and street name
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="landmark"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nearby Landmark</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. Green gate, near Jama Masjid..."
                                                    {...field}
                                                    className="h-12 bg-muted/50 rounded-xl"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                Helps volunteers find your house quickly
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex gap-4">
                                    <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={prevStep}>
                                        ← Back
                                    </Button>
                                    <Button type="button" className="flex-1 h-12 rounded-xl" onClick={nextStep}>
                                        Continue →
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Booking Duration */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div className="text-center mb-4">
                                    <h3 className="text-lg font-semibold">How long do you need tiffins?</h3>
                                    <p className="text-sm text-muted-foreground">Choose your booking duration</p>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="bookingType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <label
                                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${field.value === "FULL_RAMADAN"
                                                            ? "border-emerald-500 bg-emerald-500/10"
                                                            : "border-muted hover:border-emerald-500/50"
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            value="FULL_RAMADAN"
                                                            checked={field.value === "FULL_RAMADAN"}
                                                            onChange={(e) => field.onChange(e.target.value)}
                                                            className="sr-only"
                                                        />
                                                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${field.value === "FULL_RAMADAN" ? "bg-emerald-500" : "bg-muted"
                                                            }`}>
                                                            <CalendarIcon className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="font-semibold">Full Ramadan</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {formatDateDisplay(RAMADAN_START_DATE)} - {formatDateDisplay(RAMADAN_END_DATE)} ({getDaysBetween(RAMADAN_START_DATE, RAMADAN_END_DATE)} days)
                                                            </div>
                                                        </div>
                                                        {field.value === "FULL_RAMADAN" && (
                                                            <Check className="h-5 w-5 text-emerald-500" />
                                                        )}
                                                    </label>

                                                    <label
                                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${field.value === "CUSTOM_DATES"
                                                            ? "border-emerald-500 bg-emerald-500/10"
                                                            : "border-muted hover:border-emerald-500/50"
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            value="CUSTOM_DATES"
                                                            checked={field.value === "CUSTOM_DATES"}
                                                            onChange={(e) => field.onChange(e.target.value)}
                                                            className="sr-only"
                                                        />
                                                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${field.value === "CUSTOM_DATES" ? "bg-emerald-500" : "bg-muted"
                                                            }`}>
                                                            <CalendarRange className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="font-semibold">Custom Dates</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                Select specific start and end dates
                                                            </div>
                                                        </div>
                                                        {field.value === "CUSTOM_DATES" && (
                                                            <Check className="h-5 w-5 text-emerald-500" />
                                                        )}
                                                    </label>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {bookingType === "CUSTOM_DATES" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                                        <FormField
                                            control={form.control}
                                            name="startDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel className="flex items-center gap-2 mb-2">
                                                        <CalendarIcon className="h-4 w-4" /> Start Date
                                                    </FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={cn(
                                                                        "w-full h-12 px-4 bg-muted/50 rounded-xl border border-input text-left font-normal",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {field.value ? (
                                                                        format(new Date(field.value + "T00:00:00"), "PPP")
                                                                    ) : (
                                                                        <span>Pick a date</span>
                                                                    )}
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value ? new Date(field.value + "T00:00:00") : undefined}
                                                                onSelect={(date) => {
                                                                    if (date) {
                                                                        const year = date.getFullYear();
                                                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                                                        const day = String(date.getDate()).padStart(2, '0');
                                                                        field.onChange(`${year}-${month}-${day}`);
                                                                    }
                                                                }}
                                                                disabled={(date) =>
                                                                    date < new Date(RAMADAN_START_DATE + "T00:00:00") ||
                                                                    date > new Date(RAMADAN_END_DATE + "T00:00:00") ||
                                                                    (!!form.watch("endDate") && date > new Date(form.watch("endDate") + "T00:00:00"))
                                                                }
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="endDate"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel className="flex items-center gap-2 mb-2">
                                                        <CalendarRange className="h-4 w-4" /> End Date
                                                    </FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={cn(
                                                                        "w-full h-12 px-4 bg-muted/50 rounded-xl border border-input text-left font-normal",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {field.value ? (
                                                                        format(new Date(field.value + "T00:00:00"), "PPP")
                                                                    ) : (
                                                                        <span>Pick a date</span>
                                                                    )}
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value ? new Date(field.value + "T00:00:00") : undefined}
                                                                onSelect={(date) => {
                                                                    if (date) {
                                                                        const year = date.getFullYear();
                                                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                                                        const day = String(date.getDate()).padStart(2, '0');
                                                                        field.onChange(`${year}-${month}-${day}`);
                                                                    }
                                                                }}
                                                                disabled={(date) =>
                                                                    date < new Date(RAMADAN_START_DATE + "T00:00:00") ||
                                                                    date > new Date(RAMADAN_END_DATE + "T00:00:00") ||
                                                                    (!!form.watch("startDate") && date < new Date(form.watch("startDate") + "T00:00:00"))
                                                                }
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Duration summary */}
                                {bookingType === "CUSTOM_DATES" && form.watch("startDate") && form.watch("endDate") && (
                                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center animate-in fade-in">
                                        <span className="text-sm text-emerald-400 font-medium">
                                            📅 {getDaysBetween(form.watch("startDate")!, form.watch("endDate")!)} days selected
                                        </span>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={prevStep}>
                                        ← Back
                                    </Button>
                                    <Button type="button" className="flex-1 h-12 rounded-xl" onClick={nextStep}>
                                        Continue →
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Tiffin Count & PIN */}
                        {step === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 text-center">
                                <FormField
                                    control={form.control}
                                    name="tiffinCount"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col items-center gap-4">
                                            <FormLabel className="text-xl">Number of Tiffins</FormLabel>
                                            <FormControl>
                                                <Stepper value={field.value} onChange={field.onChange} max={5} />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                How many people will be eating Sehri?
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="pin"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col items-center gap-4">
                                            <FormLabel className="flex items-center gap-2">
                                                <Lock className="h-4 w-4" /> Create 4-Digit PIN
                                            </FormLabel>
                                            <FormControl>
                                                <PinInput value={field.value} onChange={field.onChange} />
                                            </FormControl>
                                            <FormDescription className="text-xs">
                                                You&apos;ll use this PIN to log in and manage your bookings
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex gap-4 pt-4 w-full">
                                    <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={prevStep}>
                                        ← Back
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Booking...
                                            </>
                                        ) : (
                                            "Book Now ✨"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
