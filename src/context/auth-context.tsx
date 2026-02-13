"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    name: string;
    role: "USER" | "ADMIN" | "VOLUNTEER";
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback(async () => {
        try {
            // Clear cookie via API
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            // Clear local storage
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
            router.push("/login");
        }
    }, [router]);

    useEffect(() => {
        const checkAuth = () => {
            const savedToken = localStorage.getItem("token");
            const savedUser = localStorage.getItem("user");

            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            } else {
                setToken(null);
                setUser(null);
            }
            setIsLoading(false);
        };

        checkAuth();

        // Patch fetch to handle 401 globally
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            if (response.status === 401) {
                // Don't recurse if the logout call itself fails
                const url = typeof args[0] === 'string' ? args[0] : (args[0] as any).url;
                if (!url?.includes('/api/auth/logout')) {
                    logout();
                }
            }
            return response;
        };

        // Sync auth across tabs
        window.addEventListener("storage", checkAuth);
        return () => {
            window.fetch = originalFetch;
            window.removeEventListener("storage", checkAuth);
        };
    }, [logout]);

    const login = (token: string, user: User) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setToken(token);
        setUser(user);

        // Redirect based on role
        if (user.role === "ADMIN") router.push("/admin");
        else if (user.role === "VOLUNTEER") router.push("/volunteer");
        else router.push("/dashboard");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
