import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { gsap } from "gsap";
import { Link } from "react-router-dom";

const HLS_SRC = "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";
const ROLES = ["Consultant", "Operator", "Strategist", "Confidant"];

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [roleIdx, setRoleIdx] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(HLS_SRC);
      hls.attachMedia(v);
      return () => hls.destroy();
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = HLS_SRC;
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setRoleIdx((i) => (i + 1) % ROLES.length), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".name-reveal", { opacity: 0, y: 50, duration: 1.2, delay: 0.1 })
      .from(".blur-in", { opacity: 0, filter: "blur(10px)", y: 20, duration: 1, stagger: 0.1 }, 0.3);
  }, []);

  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Video bg */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-bg to-transparent" />
      </div>

      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4">
        <nav
          className={`inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface/70 px-2 py-2 transition-shadow ${
            scrolled ? "shadow-md shadow-black/20" : ""
          }`}
        >
          <div className="relative h-9 w-9 rounded-full p-[2px] accent-gradient hover:scale-110 transition-transform">
            <div className="h-full w-full rounded-full bg-bg flex items-center justify-center">
              <span className="font-display italic text-[13px]">A</span>
            </div>
          </div>
          <div className="w-px h-5 bg-stroke mx-1 hidden sm:block" />
          {[
            { label: "Home", to: "/" },
            { label: "Dashboard", to: "/app" },
            { label: "Manifesto", to: "/" },
          ].map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-muted-foreground hover:text-text-primary hover:bg-stroke/50 transition"
            >
              {l.label}
            </Link>
          ))}
          <div className="w-px h-5 bg-stroke mx-1 hidden sm:block" />
          <Link
            to="/app"
            className="relative group rounded-full"
          >
            <span className="absolute -inset-[2px] rounded-full accent-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative inline-flex items-center gap-1 bg-surface rounded-full backdrop-blur-md text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 text-text-primary">
              Enter ARIA <span aria-hidden>↗</span>
            </span>
          </Link>
        </nav>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="blur-in text-xs text-muted-foreground uppercase tracking-[0.3em] mb-8">
          COLLECTION '26
        </div>
        <h1 className="name-reveal text-6xl md:text-8xl lg:text-9xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-6">
          ARIA
        </h1>
        <div className="blur-in text-2xl md:text-3xl font-display text-text-primary/90 mb-6">
          A{" "}
          <span
            key={roleIdx}
            className="font-display italic text-text-primary animate-role-fade-in inline-block"
          >
            {ROLES[roleIdx]}
          </span>{" "}
          on retainer.
        </div>
        <p className="blur-in text-sm md:text-base text-muted-foreground max-w-md mb-12">
          Senior intelligence that diagnoses your business, executes outreach,
          and remembers every conversation — so you never start from zero.
        </p>
        <div className="blur-in inline-flex gap-4 flex-wrap justify-center">
          <Link
            to="/app"
            className="rounded-full text-sm px-7 py-3.5 bg-text-primary text-bg hover:scale-105 transition-transform"
          >
            Enter Dashboard
          </Link>
          <a
            href="#works"
            className="rounded-full text-sm px-7 py-3.5 border-2 border-stroke bg-bg text-text-primary hover:scale-105 transition-transform"
          >
            See the work
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
        <span className="text-xs text-muted-foreground uppercase tracking-[0.2em]">SCROLL</span>
        <div className="w-px h-10 bg-stroke relative overflow-hidden">
          <span className="absolute inset-x-0 h-1/3 accent-gradient animate-scroll-down" />
        </div>
      </div>
    </section>
  );
}
