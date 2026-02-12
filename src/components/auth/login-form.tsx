"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PinInput } from "@/components/shared/pin-input";
import { useAuth } from "@/context/auth-context";
import { Phone, Lock, Loader2 } from "lucide-react";

const loginSchema = z.object({
    phone: z.string().min(10, "Valid phone number required").regex(/^\d+$/, "Only digits allowed"),
    pin: z.string().length(4, "PIN must be 4 digits"),
});

export function LoginForm() {
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            phone: "",
            pin: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof loginSchema>) => {
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                body: JSON.stringify(values),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Login failed");

            login(data.token, data.user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="premium-card w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="text-3xl font-bold gradient-text text-center">Login</CardTitle>
                <CardDescription className="text-center">Enter your phone and PIN to continue</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4" /> Phone Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="9876543210" {...field} className="h-12 bg-muted/50 rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="pin"
                            render={({ field }) => (
                                <FormItem className="flex flex-col items-center gap-4">
                                    <FormLabel className="flex items-center gap-2"><Lock className="h-4 w-4" /> 4-Digit PIN</FormLabel>
                                    <FormControl>
                                        <PinInput value={field.value} onChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {error && <p className="text-red-400 text-sm text-center font-medium">{error}</p>}

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-bold"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
