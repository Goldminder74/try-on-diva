import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";

export const Route = createFileRoute("/privacy")({
  staticData: { sitemap: true },
  head: () => ({
    links: [{ rel: "canonical", href: "https://wigsmi.com/privacy" }],
    meta: [
      { property: "og:url", content: "https://wigsmi.com/privacy" },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
      { title: "Privacy Policy - Wigsmi" },
      {
        name: "description",
        content:
          "How Wigsmi collects, uses, and protects your personal data under UK GDPR and the Data Protection Act 2018.",
      },
      { property: "og:title", content: "Privacy Policy - Wigsmi" },
      { property: "og:description", content: "How Wigsmi handles your personal data." },
    ],
  }),
  component: PrivacyPage,
});

const UPDATED = "14 November 2026";

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
              This policy explains how <strong>Sherwood Consulting Services Ltd</strong>, trading as
              Wigsmi ("we", "us", "our"), collects and uses your personal data when you use our
              website, mobile app, or virtual try-on service (the "Service"). We act as a data
              controller under the UK General Data Protection Regulation (UK GDPR) and the Data
              Protection Act 2018.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">1. Who we are</h2>
            <p>
              Wigsmi is operated by <strong>Sherwood Consulting Services Ltd</strong> from the
              United Kingdom. If you have any questions about this policy or your data, contact us
              at{" "}
              <a className="underline" href="mailto:privacy@wigsmi.com">
                privacy@wigsmi.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">2. Data we collect</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Account data:</strong> name, email, password (hashed), account type.
              </li>
              <li>
                <strong>Profile data:</strong> optional preferences, style quiz answers, wishlist.
              </li>
              <li>
                <strong>Photos:</strong> the selfie you upload is used to create your try-on; we do
                not save the selfie itself. If you are signed in, each try-on result is saved to
                your account history. You can delete any saved try-on, or your whole history, from
                your account at any time. If you do not have an account, the try-on result is stored
                with the record of your no-account try-on. These results and records are deleted
                automatically 30 days after the try-on. A profile photo you add to your account is
                stored until you replace it or ask us to delete it.
              </li>
              <li>
                <strong>Usage data:</strong> try-on counts, pages visited, device and browser info.
                To apply the free try-on limit for visitors without an account, Wigsmi stores a
                random device identifier in your browser's local storage and keeps a one-way hashed
                (scrambled) version of your browser's characteristics and of your IP address, not
                the raw IP address. These are deleted with the no-account try-on record, 30 days
                after the try-on.
              </li>
              <li>
                <strong>How you found us:</strong> when you arrive from a link carrying campaign
                tags (utm_source, utm_medium, utm_campaign and similar), Wigsmi records those tags
                with your account or no-account try-on, to measure which channels bring visitors.
              </li>
              <li>
                <strong>Tracked shop visits:</strong> if you tap "Buy from ..." on a listing at a
                shop that pays us commission, we record a one-time reference code with the wig, the
                time and the page you came from, so that shop can match the visit to an order later.
                We do not send the shop your name or email.
              </li>
              <li>
                <strong>Retailer data:</strong> business name, optional VAT number, contact details,
                catalog content, payment metadata (handled by our payment processor - we do not
                store card numbers).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">3. Why we use it (lawful bases)</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Contract:</strong> to provide the Service you signed up for (account,
                try-on, retailer portal).
              </li>
              <li>
                <strong>Legitimate interests:</strong> to keep the Service secure, prevent fraud,
                measure usage, and improve our product.
              </li>
              <li>
                <strong>Consent:</strong> for optional marketing emails and non-essential cookies.
                You can withdraw consent at any time.
              </li>
              <li>
                <strong>Legal obligation:</strong> tax, accounting, and responding to lawful
                requests.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">
              4. Try-on photos and AI processing
            </h2>
            <p>
              Photos you upload are processed by our AI try-on engine to generate a preview. They
              are stored in encrypted cloud storage. You can delete any saved try-on, or your whole
              history, from your account at any time, and you can delete your account from Account
              settings. Deleting removes the images from our storage. We do not use your photos to
              train third-party AI models, and we do not sell them. Try-on photos are sent to Google
              LLC's Gemini image API for processing and are not used by Google to train its models;
              Google keeps them only for a limited period to detect misuse of its service, under its
              Gemini API terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">5. Sharing your data</h2>
            <p>We share data only with processors that help us run the Service:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Cloud hosting and database providers.</li>
              <li>
                Stripe (stripe.com) processes payment information and supports billing for retailer
                and consumer subscriptions. Its role and applicable transaction terms are shown at
                checkout. See stripe.com/privacy.
              </li>
              <li>
                Google LLC (Gemini image API) - processes selfie photos you upload solely to
                generate your virtual try-on result. Google is incorporated in the USA; transfers
                are covered by Standard Contractual Clauses. See policies.google.com/privacy. Google
                does not use these photos to improve its products and keeps them only for a limited
                period to detect misuse.
              </li>
              <li>Email delivery providers.</li>
              <li>Analytics providers (aggregated, where possible).</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data. Where data is transferred outside the UK, we rely
              on appropriate safeguards (e.g. UK-approved Standard Contractual Clauses or adequacy
              decisions).
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">6. How long we keep it</h2>
            <p>
              We keep personal data only as long as needed for the purposes set out above, or as
              required by law. You can delete your account at any time from Account settings. We
              then delete your personal data straight away, except payment records we must keep by
              law, which are anonymised. Saved try-on history is kept until you delete it or delete
              your account. No-account try-on records and results are deleted automatically 30 days
              after the try-on; you can also ask us to delete them sooner.
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
              <li>
                Complain to the Information Commissioner's Office (ICO) at{" "}
                <a className="underline" href="https://ico.org.uk" target="_blank" rel="noreferrer">
                  ico.org.uk
                </a>
                .
              </li>
            </ul>
            <p className="mt-3">
              To exercise any right, email{" "}
              <a className="underline" href="mailto:privacy@wigsmi.com">
                privacy@wigsmi.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">
              8. Cookies and similar technologies
            </h2>
            <p>
              We use strictly necessary cookies to keep you signed in and the Service working. With
              your consent, we may use analytics cookies to understand how the Service is used. For
              visitors without an account, we also store a random device identifier in your
              browser's local storage; this is strictly necessary for applying the free try-on
              limit. You can manage cookies and local storage in your browser at any time.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">9. Security</h2>
            <p>
              We use encryption in transit and at rest, role-based access controls, and regular
              reviews. No system is perfectly secure, but we take reasonable steps to protect your
              data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">10. Children</h2>
            <p>
              The Service is not directed at children under 13. If you believe a child has provided
              us with personal data, contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">11. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. Material changes will be notified via
              email or an in-app notice. The "Last updated" date above shows the latest revision.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
