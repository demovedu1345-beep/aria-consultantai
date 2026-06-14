import { useState } from "react";
import { LoadingScreen } from "@/components/landing/LoadingScreen";
import { Hero } from "@/components/landing/Hero";
import { AuditSection } from "@/components/landing/AuditSection";
import { RoiCalculator } from "@/components/landing/RoiCalculator";
import { SelectedWorks } from "@/components/landing/SelectedWorks";
import { CaseStudies } from "@/components/landing/CaseStudies";
import { BookingSection } from "@/components/landing/BookingSection";
import { Journal } from "@/components/landing/Journal";
import { Stats } from "@/components/landing/Stats";
import { Footer } from "@/components/landing/Footer";

export default function Landing() {
  const [loading, setLoading] = useState(true);
  return (
    <main className="bg-bg text-text-primary">
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      <Hero />
      <AuditSection />
      <RoiCalculator />
      <SelectedWorks />
      <CaseStudies />
      <BookingSection />
      <Journal />
      <Stats />
      <Footer />
    </main>
  );
}
