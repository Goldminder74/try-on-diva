import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { saveStyleQuiz } from "@/lib/consumer-profile.functions";

export const Route = createFileRoute("/_authenticated/app/style-quiz")({
  head: () => ({ meta: [{ title: "Style Quiz - Wigsmi" }] }),
  component: Quiz,
});

const FACE_SHAPES = [
  { v: "oval", label: "Oval" }, { v: "round", label: "Round" }, { v: "heart", label: "Heart" },
  { v: "square", label: "Square" }, { v: "long", label: "Long" }, { v: "diamond", label: "Diamond" },
] as const;
const VIBES = ["Bob", "Long", "Glueless", "HD Wig", "Curly", "Body Wave", "Kinky Coily", "Straight"];
const LIFESTYLES = ["Office", "Athletic", "Night out", "Stay-at-home", "Creative", "Travel"];
const BUDGETS = [
  { v: "under-100", label: "Under £100" },
  { v: "100-250", label: "£100 – £250" },
  { v: "250-500", label: "£250 – £500" },
  { v: "500-plus", label: "£500+" },
] as const;

type Budget = "under-100" | "100-250" | "250-500" | "500-plus";
type Face = "oval" | "round" | "heart" | "square" | "long" | "diamond";

function Quiz() {
  const save = useServerFn(saveStyleQuiz);
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [face, setFace] = useState<Face | null>(null);
  const [skin, setSkin] = useState<number | null>(null);
  const [vibes, setVibes] = useState<string[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [life, setLife] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const submit = async () => {
    setBusy(true);
    try {
      await save({
        data: {
          face_shape: face,
          skin_tone: skin,
          style_vibe: vibes,
          budget,
          lifestyle: life,
        },
      });
      nav({ to: "/app" });
    } finally {
      setBusy(false);
    }
  };

  const steps = [
    {
      label: "Face shape",
      body: (
        <div className="grid grid-cols-3 gap-3">
          {FACE_SHAPES.map((f) => (
            <Pick key={f.v} active={face === f.v} onClick={() => setFace(f.v as Face)}>{f.label}</Pick>
          ))}
        </div>
      ),
    },
    {
      label: "Skin tone",
      body: (
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setSkin(n)}
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-xs ${skin === n ? "border-mahogany" : "border-transparent"}`}
              style={{ backgroundColor: ["#F5D5B0", "#E0B080", "#B57A4A", "#7A4A26", "#4F2C12", "#2D1808"][n - 1] }}
            >
              <span className="text-cream/80">{n}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      label: "Style vibe",
      body: (
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => (
            <Pick key={v} active={vibes.includes(v)} onClick={() => setVibes(toggle(vibes, v))}>{v}</Pick>
          ))}
        </div>
      ),
    },
    {
      label: "Budget",
      body: (
        <div className="grid grid-cols-2 gap-3">
          {BUDGETS.map((b) => (
            <Pick key={b.v} active={budget === b.v} onClick={() => setBudget(b.v as Budget)}>{b.label}</Pick>
          ))}
        </div>
      ),
    },
    {
      label: "Lifestyle",
      body: (
        <div className="flex flex-wrap gap-2">
          {LIFESTYLES.map((v) => (
            <Pick key={v} active={life.includes(v)} onClick={() => setLife(toggle(life, v))}>{v}</Pick>
          ))}
        </div>
      ),
    },
  ];

  const cur = steps[step];

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-12">
      <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Style quiz {step + 1} / {steps.length}</p>
      <h1 className="mt-1 font-display text-4xl text-mahogany">{cur.label}.</h1>

      <div className="mt-8">{cur.body}</div>

      <div className="mt-12 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-sm text-muted-foreground hover:text-mahogany disabled:opacity-30"
        >
          Back
        </button>
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="rounded-md bg-mahogany px-5 py-2.5 text-sm text-cream hover:bg-mahogany-soft"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-mahogany hover:bg-gold-dark hover:text-cream disabled:opacity-50"
          >
            {busy ? "Saving…" : "Finish"}
          </button>
        )}
      </div>
    </div>
  );
}

function Pick({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-4 py-3 text-sm transition-colors ${active ? "border-mahogany bg-mahogany text-cream" : "border-border bg-card text-foreground hover:border-mahogany"}`}
    >
      {children}
    </button>
  );
}
