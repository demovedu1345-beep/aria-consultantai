import { useState } from "react";
import { LoadingScreen } from "@/components/landing/LoadingScreen";
import { Hero } from "@/components/landing/Hero";
import { SelectedWorks } from "@/components/landing/SelectedWorks";
import { Journal } from "@/components/landing/Journal";
import { Stats } from "@/components/landing/Stats";
import { Footer } from "@/components/landing/Footer";

export default function Landing() {
  const [loading, setLoading] = useState(true);
  return (
    <main className="bg-bg text-text-primary">
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      <Hero />
      <SelectedWorks />
      <Journal />
      <Stats />
      <Footer />
    </main>
  );
}
