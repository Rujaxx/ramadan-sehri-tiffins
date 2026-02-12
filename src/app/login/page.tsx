import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { Moon } from "lucide-react";

export default function LoginPage() {
    return (
        <main className="min-h-screen pt-12 pb-24 px-4 relative overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />

            <div className="w-full relative z-10 space-y-8">
                <div className="text-center space-y-2">
                    <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm mb-4">
                        <Moon className="h-4 w-4" /> Back to Home
                    </Link>
                    <h1 className="text-4xl font-black">Welcome <span className="gradient-text">Back.</span></h1>
                </div>

                <LoginForm />

                <p className="text-center text-zinc-500 font-medium">
                    Don't have a booking? <Link href="/" className="text-emerald-400 font-bold hover:underline">Register & Book</Link>
                </p>
            </div>
        </main>
    );
}
