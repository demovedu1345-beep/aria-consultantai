import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <main className="min-h-screen bg-bg text-text-primary py-16 px-6">
      <article className="max-w-2xl mx-auto prose-invert">
        <Link to="/" className="text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-text-primary">← Home</Link>
        <h1 className="font-display italic text-5xl mt-4 mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-6">Last updated: June 2026</p>

        <Section title="What we collect">
          When you complete the AI Business Audit or book a consultation, we collect your name, phone, email, business name, category, and the answers you provide.
        </Section>
        <Section title="Why we collect it">
          To generate your personalized ARIA report, contact you for the consultation you requested, and improve our service. Nothing more.
        </Section>
        <Section title="What we don't do">
          We do not sell your data. We do not share it with advertising networks. We do not spam you.
        </Section>
        <Section title="Storage">
          Lead data is stored on our backend (or locally in your browser, depending on configuration) so we can answer your enquiry.
        </Section>
        <Section title="Your rights">
          You can request removal of your data at any time by emailing hello@aria.ai.
        </Section>
      </article>
    </main>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-display italic text-2xl mb-2">{title}</h2>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </section>
  );
}
