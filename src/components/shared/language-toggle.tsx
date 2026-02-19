"use client";

import { useState, useEffect } from "react";
import { Languages, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export function LanguageToggle() {
    const [isMarathi, setIsMarathi] = useState(false);

    useEffect(() => {
        // Check if Marathi is already active by looking at the googtrans cookie
        const checkLanguage = () => {
            const cookies = document.cookie.split("; ");
            const transCookie = cookies.find(c => c.startsWith("googtrans="));
            if (transCookie && transCookie.includes("/mr")) {
                setIsMarathi(true);
            } else {
                setIsMarathi(false);
            }
        };

        checkLanguage();
        // Periodically check as the cookie might change without a state update
        const interval = setInterval(checkLanguage, 2000);
        return () => clearInterval(interval);
    }, []);

    const toggleLanguage = () => {
        try {
            if (!isMarathi) {
                // Set cookie for Marathi
                document.cookie = "googtrans=/en/mr; path=/; domain=" + window.location.hostname;
                document.cookie = "googtrans=/en/mr; path=/"; // Fallback for local
                setIsMarathi(true);
                toast.success("Marathi translation active");
            } else {
                // Set cookie back to English (or remove)
                document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
                document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
                setIsMarathi(false);
                toast.info("Switched to English");
            }
            // Real translation usually requires a reload or the Google Widget to pick up changes
            window.location.reload();
        } catch (error) {
            console.error("Translation toggle failed:", error);
            toast.error("Failed to switch language");
        }
    };

    return (
        <>
            <style jsx global>{`
                .goog-te-banner-frame,
                .goog-te-banner-frame.skiptranslate,
                #goog-gt-tt,
                .goog-te-balloon-frame,
                .skiptranslate,
                iframe.goog-te-menu-frame,
                #google_translate_element,
                .goog-te-gadget-icon,
                .goog-te-gadget-simple,
                .goog-tooltip,
                .goog-te-balloon,
                #goog-gt-v,
                .VIpgJd-ZVi9nd-OR9uAe-pnS5u,
                .VIpgJd-ZVi9nd-OR9uAe-v9v0re-l699le,
                .VIpgJd-y66xeb-l4e7ec,
                .VIpgJd-ZVi9nd-aZ2wEe-OiiCO,
                .VIpgJd-ZVi9od-aZ2wEe-OiiCO-ti6hGc,
                .goog-te-spinner-pos,
                .goog-te-spinner,
                .VIpgJd-ZVi9od-aZ2wEe-OiiCO,
                *[id*="goog-gt-"],
                *[class*="goog-te-"] {
                    display: none !important;
                    visibility: hidden !important;
                }
                body {
                    top: 0 !important;
                }
                .goog-text-highlight {
                    background-color: transparent !important;
                    box-shadow: none !important;
                }
            `}</style>
            <button
                onClick={toggleLanguage}
                aria-label={isMarathi ? "Switch to English" : "Switch to Marathi"}
                title={isMarathi ? "Switch to English" : "Translate to Marathi"}
                className="fixed bottom-6 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-background/80 backdrop-blur-md border border-border shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full ${isMarathi ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-black'}`}>
                    {isMarathi ? (
                        <span className="text-[10px] font-black">En</span>
                    ) : (
                        <span className="text-[14px] font-black">अ</span>
                    )}
                </div>
                <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">
                    {isMarathi ? "English" : "मराठी"}
                </span>
                <Languages className={`h-4 w-4 ${isMarathi ? 'text-orange-500' : 'text-emerald-500'}`} />
            </button>
        </>
    );
}
