import { RegistrationForm } from "@/components/user/registration-form";
import { Moon, Star } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen pt-12 pb-24 px-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />

      <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-12 relative z-10">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-sm">
              <Moon className="h-4 w-4" /> Ramadan 1447
            </div>
            <Link href="/login" className="text-sm font-bold text-zinc-500 hover:text-emerald-400 transition-colors">
              Already have a booking? Login here →
            </Link>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
            Sehri <span className="gradient-text">By Apna Naka Group.</span>
          </h1>
          {/* <p className="max-w-lg mx-auto text-muted-foreground text-lg md:text-xl font-medium">
            Book your daily tiffin in under 60 seconds. Fresh, hot, and delivered to your doorstep.
          </p> */}
        </div>

        <div className="w-full flex justify-center">
          <RegistrationForm />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-12">
          {/* <FeatureCard
            icon={<Star className="h-6 w-6 text-emerald-400" />}
            title="Premium Quality"
            description="Nutritious and delicious meals prepared with love and hygiene."
          /> */}
          <FeatureCard
            icon={<Moon className="h-6 w-6 text-cyan-400" />}
            title="Timely Delivery"
            description="Our volunteers ensure your food reach you before the Fajar cutoff."
          />
          <FeatureCard
            icon={<Star className="h-6 w-6 text-emerald-400" />}
            title="Community Driven"
            description="Powered by the Apna Naka Group and local volunteers from your area."
          />
        </div>
      </div>

      <footer className="mt-24 text-center text-muted-foreground text-sm font-medium">
        © 2026 Sehri Tiffin Service • Built with Barkat for the Community
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="premium-card text-left space-y-3">
      <div className="bg-muted w-12 h-12 rounded-xl flex items-center justify-center border border-border">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
