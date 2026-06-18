import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/wigsmi/Header";
import { Footer } from "@/components/wigsmi/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Wigsmi" },
      { name: "description", content: "The terms that govern your use of Wigsmi's virtual wig try-on service." },
      { property: "og:title", content: "Terms of Service — Wigsmi" },
      { property: "og:description", content: "Terms governing your use of Wigsmi." },
    ],
  }),
  component: TermsPage,
});

const UPDATED = "10 May 2026";

function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="mx-auto w-full max-w-3xl px-5 py-16">
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Legal</p>
        <h1 className="mt-2 font-display text-4xl text-mahogany md:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

        <div className="mt-10 space-y-8 text-foreground">
          <section>
            <p>
              These terms ("Terms") form a binding agreement between you and{" "}
              <strong>SHERWOOD CONSULTING SERVICES LTD</strong>, trading as Wigsmi
              ("we", "us", "our"), and govern your use of the Wigsmi website, app, and
              services (the "Service"). By creating an account or using the Service
              you agree to these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">1. Eligibility</h2>
            <p>
              You must be at least 16 years old to create an account. If you are
              using the Service on behalf of a business (a "Retailer"), you confirm
              that you have authority to bind that business to these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">2. Your account</h2>
            <p>
              You are responsible for keeping your login credentials secure and for
              activity on your account. Tell us immediately at{" "}
              <a className="underline" href="mailto:support@wigsmi.com">support@wigsmi.com</a>{" "}
              if you suspect unauthorised access.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">3. Consumer service</h2>
            <p>
              The consumer Service includes browsing the wig catalog, uploading
              selfies for AI try-on, and saving favourites. Free accounts have a
              monthly try-on quota; paid tiers (Plus and Pro) lift the quota.
              Try-on results are AI-generated previews and may not exactly match the
              physical product.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">4. Retailer service</h2>
            <p>
              Retailers may list wigs, embed the try-on widget on their own site, and
              access analytics. Subscriptions auto-renew until cancelled. Pricing,
              free-trial length, and feature limits are shown at sign-up and may
              change with notice. You are responsible for the accuracy and legality
              of all content you upload (images, descriptions, pricing, stock
              status, links).
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">5. Payments, refunds, and cancellation</h2>
            <div className="mt-3 space-y-3">
              <p>All payments are processed by Paddle (paddle.com), who acts as the merchant of record for transactions on Wigsmi. Your payment contract is with Paddle, and Paddle's terms apply to all billing matters.</p>
              <p>Retailer subscriptions are billed monthly or yearly in advance and auto-renew until cancelled. You may cancel at any time from your billing portal; access continues until the end of the paid period.</p>
              <p>Consumer paid plans are billed monthly and auto-renew until cancelled. You may cancel at any time from your account settings.</p>
              <p>Refunds: you may request a full refund within 30 days of any purchase by emailing support@wigsmi.com. After 30 days, fees are non-refundable except where required by law.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">6. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Upload photos of anyone without their permission.</li>
              <li>Upload illegal, infringing, harassing, or sexually explicit content.</li>
              <li>Reverse-engineer, scrape, or abuse the Service or its APIs.</li>
              <li>Use the Service to mislead consumers or breach consumer-protection law.</li>
              <li>Resell or sublicense the Service without our written consent.</li>
            </ul>
            <p className="mt-3">We may suspend or terminate accounts that breach these rules.</p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">7. Content and licence</h2>
            <p>
              You keep ownership of the photos and content you upload. You grant us a
              worldwide, royalty-free licence to host, process, and display that
              content solely to operate and improve the Service. Retailers grant us
              the additional right to display their catalog content to consumers
              browsing the Service. We may remove content that violates these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">8. Third-party purchases</h2>
            <p>
              Wigsmi is a try-on and discovery service. When you buy a wig, your
              contract is with the retailer, not with us. We are not responsible for
              the quality, delivery, or returns of products bought from third-party
              retailers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">9. Disclaimers</h2>
            <p>
              The Service is provided "as is". To the fullest extent permitted by
              law, we exclude all implied warranties. AI try-on results are
              illustrative only and may differ from real-world results due to
              lighting, photo quality, and product variation.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">10. Liability</h2>
            <p>
              Nothing in these Terms limits liability that cannot be limited by law
              (including for death or personal injury caused by negligence, or for
              fraud). Subject to that, our total liability to you for any claim
              relating to the Service is limited to the fees you paid us in the 12
              months before the claim, or £100 if you are a free user. We are not
              liable for indirect or consequential losses, loss of profit, business,
              or data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">11. Termination</h2>
            <p>
              You can close your account at any time. We may suspend or terminate
              access if you breach these Terms, if required by law, or if we
              discontinue the Service. Provisions that by their nature should
              survive termination (e.g. liability, IP, governing law) will do so.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">12. Changes</h2>
            <p>
              We may update these Terms from time to time. We will notify you of
              material changes by email or in-app notice. Continued use after the
              effective date means you accept the new Terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">13. Governing law</h2>
            <p>
              These Terms are governed by the laws of England and Wales. The courts
              of England and Wales have exclusive jurisdiction, except that
              consumers resident elsewhere in the UK may bring proceedings in their
              local courts.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl text-mahogany">14. Contact</h2>
            <p>
              Questions about these Terms? Email{" "}
              <a className="underline" href="mailto:support@wigsmi.com">support@wigsmi.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
