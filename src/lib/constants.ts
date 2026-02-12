export const CUTOFF_HOUR = 20; // 8 PM
export const MAX_TIFFINS_PER_USER = 5;

// Ramadan 1447 (2026) dates
export const RAMADAN_START_DATE = "2026-02-18";
export const RAMADAN_END_DATE = "2026-03-19";

export const RAMADAN_AREAS = [
    "Dayanand college",
    "Collector office",
    "Nikki bar",
    "Khadgav road",
    "Tution area",
    "Civil hospital",
    "Khori galli madina masjid",
    "Khori galli Ayesha colony",
    "Old Renapur naka",
    "Medical College",
    "Bus stand",
    "Golai",
    "Nanded road",
    "Railway station",
    "Sohail Nagar",
];

export const APP_NAME = "Apna Naka Group Sehri";

export const BOOKING_STATUS = {
    ACTIVE: "ACTIVE",
    CANCELLED: "CANCELLED",
    DELIVERED: "DELIVERED",
} as const;

export const ROLES = {
    USER: "USER",
    ADMIN: "ADMIN",
    VOLUNTEER: "VOLUNTEER",
} as const;
