import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Wigsmi" },
      { name: "description", content: "How Wigsmi collects, uses, and protects your personal data under UK GDPR and the Data Protection Act 2018." },
      { property: "og:title", content: "Privacy Policy — Wigsmi" },
      { property: "og:description", content: "How Wigsmi handles your personal data." },
    ],
  }),
  component: PrivacyPage,
});

const UPDATED = "10 May 2026";

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-16">
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Legal</p>
        <h1 className="mt-2 font-display text-4xl text-mahogany md:text-5xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

        <div className="prose-legal mt-10 space-y-8 text-foreground">
          <section>
            <p>
              This policy explains how{" "}
              <strong>SHERWOOD CONSULTING SERVICES LTD</strong>, trading as Wigsmi
              ("we", "us", "our"), collects and uses your personal data when you use
              our website, mobile app, or virtual try-on service (the "Service"). We
              act as a data controller under the UK General Data Protection Regulation
              (UK GDPR) and the Data Protection Act 2018.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">1. Who we are</h2>
            <p>
              Wigsmi is operated by <strong>SHERWOOD CONSULTING SERVICES LTD</strong>{" "}
              from the United Kingdom. If you have any questions about this policy or
              your data, contact us at{" "}
              <a className="underline" href="mailto:privacy@wigsmi.com">privacy@wigsmi.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">2. Data we collect</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Account data:</strong> name, email, password (hashed), account type.</li>
              <li><strong>Profile data:</strong> optional preferences, style quiz answers, wishlist.</li>
              <li><strong>Photos:</strong> selfies you upload for try-on. Stored only as long as needed to render the result and any photos you choose to save.</li>
              <li><strong>Usage data:</strong> try-on counts, pages visited, device and browser info, IP address.</li>
              <li><strong>Retailer data:</strong> business name, contact details, catalog content, payment metadata (handled by our payment processor — we do not store card numbers).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">3. Why we use it (lawful bases)</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Contract:</strong> to provide the Service you signed up for (account, try-on, retailer portal).</li>
              <li><strong>Legitimate interests:</strong> to keep the Service secure, prevent fraud, measure usage, and improve our product.</li>
              <li><strong>Consent:</strong> for optional marketing emails and non-essential cookies. You can withdraw consent at any time.</li>
              <li><strong>Legal obligation:</strong> tax, accounting, and responding to lawful requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">4. Try-on photos and AI processing</h2>
            <p>
              Photos you upload are processed by our AI try-on engine to generate a
              preview. They are stored in encrypted cloud storage. You can delete any
              saved photo from your account at any time. We do not use your photos to
              train third-party AI models, and we do not sell them.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">5. Sharing your data</h2>
            <p>We share data only with processors that help us run the Service:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Cloud hosting and database providers.</li>
              <li>Payment processors (for retailer subscriptions).</li>
              <li>AI model providers used for the try-on engine.</li>
              <li>Email delivery providers.</li>
              <li>Analytics providers (aggregated, where possible).</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data. Where data is transferred outside the
              UK, we rely on appropriate safeguards (e.g. UK-approved Standard
              Contractual Clauses or adequacy decisions).
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">6. How long we keep it</h2>
            <p>
              We keep personal data only as long as needed for the purposes set out
              above, or as required by law. When you delete your account, we delete or
              anonymise your personal data within 30 days, except where we are legally
              required to retain it (e.g. financial records).
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">7. Your rights</h2>
            <p>Under UK GDPR you have the right to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate data.</li>
              <li>Request deletion ("right to be forgotten").</li>
              <li>Restrict or object to processing.</li>
              <li>Data portability.</li>
              <li>Withdraw consent at any time.</li>
              <li>Complain to the Information Commissioner's Office (ICO) at{" "}
                <a className="underline" href="https://ico.org.uk" target="_blank" rel="noreferrer">ico.org.uk</a>.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any right, email{" "}
              <a className="underline" href="mailto:privacy@wigsmi.com">privacy@wigsmi.com</a>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">8. Cookies</h2>
            <p>
              We use strictly necessary cookies to keep you signed in and the Service
              working. With your consent, we may use analytics cookies to understand
              how the Service is used. You can manage cookies in your browser at any
              time.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">9. Security</h2>
            <p>
              We use encryption in transit and at rest, role-based access controls,
              and regular reviews. No system is perfectly secure, but we take
              reasonable steps to protect your data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">10. Children</h2>
            <p>
              The Service is not directed at children under 13. If you believe a child
              has provided us with personal data, contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">11. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be
              notified via email or an in-app notice. The "Last updated" date above
              shows the latest revision.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
