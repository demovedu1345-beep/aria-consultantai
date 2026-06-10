import { useEffect, useRef, useState, ReactNode } from "react";
import Hls from "hls.js";
import { Link, useLocation } from "react-router-dom";

const HLS_SRC = "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";

interface Props {
  children: ReactNode;
  rightSlot?: ReactNode;
}

export function AppShell({ children, rightSlot }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

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

  return (
    <div className="relative min-h-screen w-full bg-bg text-text-primary">
      {/* Cinematic video backdrop — identical to landing Hero */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 object-cover"
        />
        {/* Cinematic darken so text stays readable, but galaxy keeps moving behind every section */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--bg)/0.55)_75%)]" />
      </div>

      {/* Landing-style floating nav (matches Hero exactly) */}
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
            { label: "Manifesto", to: "/#works" },
          ].map((l) => {
            const active = pathname === l.to || (l.to === "/app" && pathname.startsWith("/app"));
            return (
              <Link
                key={l.label}
                to={l.to}
                className={`text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 transition ${
                  active
                    ? "text-text-primary bg-stroke/60"
                    : "text-muted-foreground hover:text-text-primary hover:bg-stroke/50"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          {rightSlot && (
            <>
              <div className="w-px h-5 bg-stroke mx-1 hidden sm:block" />
              {rightSlot}
            </>
          )}
        </nav>
      </div>

      <div className="relative z-10 pt-28">{children}</div>
    </div>
  );
}
