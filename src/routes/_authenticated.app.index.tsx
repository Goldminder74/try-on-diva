import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchFeaturedWigs, fetchWigs, type Wig } from "@/lib/wigs";
import { WigCard } from "@/components/wigsmi/WigCard";
import { WigCardSkeleton } from "@/components/wigsmi/WigCardSkeleton";
import { useServerFn } from "@tanstack/react-start";
import { getMyConsumerProfile } from "@/lib/consumer-profile.functions";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "For You — Wigsmi" }] }),
  component: ForYou,
});

function ForYou() {
  const { user } = useAuth();
  const fetchProfile = useServerFn(getMyConsumerProfile);
  const [featured, setFeatured] = useState<Wig[] | null>(null);
  const [picks, setPicks] = useState<Wig[] | null>(null);
  const [hasQuiz, setHasQuiz] = useState<boolean>(false);
  const [vibes, setVibes] = useState<string[]>([]);

  useEffect(() => {
    let on = true;
    Promise.all([fetchFeaturedWigs(8), fetchWigs(), fetchProfile()])
      .then(([f, all, prof]) => {
        if (!on) return;
        setFeatured(f);
        const v = prof.consumer?.style_vibe ?? [];
        setVibes(v);
        setHasQuiz(!!prof.consumer?.quiz_completed_at);
        // simple personalisation: filter by hair_texture or style_type matching a vibe word
        if (v.length) {
          const lc = v.map((x: string) => x.toLowerCase());
          const matched = all.filter(
            (w) =>
              lc.includes(w.style_type.toLowerCase()) ||
              lc.includes(w.hair_texture.toLowerCase()),
          );
          setPicks(matched.slice(0, 8));
        } else {
          setPicks(all.slice(0, 8));
        }
      })
      .catch(() => {
        if (!on) return;
        setFeatured([]);
        setPicks([]);
      });
    return () => {
      on = false;
    };
  }, [fetchProfile]);

  const greeting = (user?.user_metadata?.display_name as string | undefined) || user?.email?.split("@")[0] || "friend";

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">For You</p>
      <h1 className="mt-1 font-display text-4xl text-mahogany md:text-5xl">Hi {greeting}.</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        {hasQuiz
          ? `Picks based on your style: ${vibes.slice(0, 3).join(", ")}.`
          : "Take the 60-second style quiz to get more personalised picks."}
      </p>

      {!hasQuiz && (
        <Link
          to="/app/style-quiz"
          className="mt-5 inline-flex rounded-md bg-mahogany px-5 py-2.5 text-sm font-medium text-cream hover:bg-mahogany-soft"
        >
          Take the style quiz
        </Link>
      )}

      <Section title="Featured this week">
        <Grid items={featured} />
      </Section>

      <Section title={hasQuiz ? "Picked for you" : "Trending"}>
        <Grid items={picks} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl text-mahogany">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Grid({ items }: { items: Wig[] | null }) {
  if (!items) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <WigCardSkeleton key={i} />)}
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map((w) => <WigCard key={w.id} wig={w} />)}
    </div>
  );
}
