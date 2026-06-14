import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LeadRecord, loadLeads, loadBookings, BookingRecord } from "@/lib/aria-audit";
import { Lock } from "lucide-react";

// TODO: replace with real authentication when DB is connected.
const ADMIN_PASSWORD = "admin123";

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [selected, setSelected] = useState<LeadRecord | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("aria_admin") === "1") setAuthed(true);
  }, []);
  useEffect(() => {
    if (!authed) return;
    setLeads(loadLeads());
    setBookings(loadBookings());
  }, [authed]);

  if (!authed) {
    return (
      <main className="min-h-screen bg-bg text-text-primary flex items-center justify-center p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pw === ADMIN_PASSWORD) { sessionStorage.setItem("aria_admin", "1"); setAuthed(true); }
            else alert("Wrong password");
          }}
          className="aria-card p-8 w-full max-w-sm bg-surface/80"
        >
          <Lock className="h-5 w-5 accent-text mb-4" />
          <h1 className="font-display italic text-3xl mb-2">Admin</h1>
          <p className="text-xs text-muted-foreground mb-6 uppercase tracking-[0.25em]">Password protected</p>
          <input
            type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="Password" autoFocus
            className="w-full rounded-xl bg-bg border border-stroke px-4 py-3 text-sm focus:outline-none focus:border-accent"
          />
          <button className="mt-4 w-full rounded-full bg-text-primary text-bg py-3 text-sm">Enter</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg text-text-primary p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/" className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-text-primary">← Home</Link>
            <h1 className="font-display italic text-4xl mt-2">Admin Console</h1>
          </div>
          <button onClick={() => { sessionStorage.removeItem("aria_admin"); setAuthed(false); }}
            className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-text-primary">Sign out</button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Stat label="Total leads" value={leads.length} />
          <Stat label="Bookings" value={bookings.length} />
          <Stat label="Avg score" value={leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0} />
        </div>

        <section className="aria-card p-5 bg-surface/70 mb-8 overflow-x-auto">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Latest leads</div>
          {leads.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet.</p> : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <tr><th className="text-left py-2">Date</th><th className="text-left">Name</th><th className="text-left">Phone</th><th className="text-left">Email</th><th className="text-left">Category</th><th className="text-left">Score</th><th /></tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-stroke">
                    <td className="py-2 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                    <td>{l.name}</td>
                    <td>{l.phone}</td>
                    <td>{l.email}</td>
                    <td>{l.category}</td>
                    <td className="accent-text">{l.score}</td>
                    <td><button onClick={() => setSelected(l)} className="text-xs underline">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="aria-card p-5 bg-surface/70 overflow-x-auto">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Bookings</div>
          {bookings.length === 0 ? <p className="text-sm text-muted-foreground">No bookings yet.</p> : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <tr><th className="text-left py-2">Date</th><th className="text-left">Name</th><th className="text-left">When</th><th className="text-left">Type</th><th className="text-left">Phone</th></tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-stroke">
                    <td className="py-2 text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td>{b.name}</td>
                    <td>{b.date} {b.time}</td>
                    <td>{b.call_type}</td>
                    <td>{b.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {selected && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
            <div className="aria-card p-6 bg-surface w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display italic text-2xl mb-1">{selected.business_name}</h3>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">{selected.category} · Score {selected.score}</p>
              <p className="text-sm text-muted-foreground mb-4">{selected.report_headline}</p>
              <dl className="text-sm space-y-1.5">
                <Row k="Name" v={selected.name} />
                <Row k="Phone" v={selected.phone} />
                <Row k="Email" v={selected.email} />
                <Row k="Website" v={selected.website_status} />
                <Row k="Monthly leads" v={String(selected.monthly_leads)} />
                <Row k="Marketing" v={selected.marketing_method} />
                <Row k="Budget" v={selected.budget_range} />
                <Row k="Problem" v={selected.biggest_problem} />
                <Row k="Goal" v={selected.business_goal} />
              </dl>
              <button onClick={() => setSelected(null)} className="mt-5 w-full rounded-full bg-text-primary text-bg py-2.5 text-sm">Close</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="aria-card p-5 bg-surface/70">
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</div>
      <div className="text-4xl font-display accent-text mt-2">{value}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 text-muted-foreground text-xs uppercase tracking-[0.2em]">{k}</dt>
      <dd className="flex-1">{v}</dd>
    </div>
  );
}
