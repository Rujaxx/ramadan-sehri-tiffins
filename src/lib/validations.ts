import * as z from "zod";

export const registrationSchema = z.object({
    name: z.string().min(2, "Name is required"),
    phone: z.string().min(10, "Valid phone number required").regex(/^\d+$/, "Only digits allowed"),
    alternatePhone: z.string().regex(/^\d{10}$/, "Must be 10 digits").optional().or(z.literal("")),
    area: z.string().min(1, "Select your area"),
    address: z.string().min(10, "Full address required"),
    landmark: z.string().optional(),
    tiffinCount: z.number().min(1).max(5),
    pin: z.string().length(4, "PIN must be 4 digits"),
    bookingType: z.enum(["FULL_RAMADAN", "CUSTOM_DATES"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
}).refine((data) => {
    if (data.bookingType === "CUSTOM_DATES") {
        return data.startDate && data.endDate;
    }
    return true;
}, {
    message: "Start and end dates are required for custom booking",
    path: ["startDate"],
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
