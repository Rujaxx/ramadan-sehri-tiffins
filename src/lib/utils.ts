import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function maskPhone(phone: string) {
  if (!phone) return "";
  return phone.length >= 4 ? "••••••" + phone.slice(-4) : "••••••";
}
