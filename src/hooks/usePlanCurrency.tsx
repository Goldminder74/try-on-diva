import { useEffect, useSyncExternalStore } from "react";
import { currencyForCountry, PLAN_CURRENCIES, type PlanCurrency } from "@/lib/plan-prices";
import { getVisitorCountry } from "@/lib/visitor-country.functions";

const STORAGE_KEY = "wigsmi_plan_currency";
let current: PlanCurrency = "GBP";
let detected = false;
const listeners = new Set<() => void>();

function set(c: PlanCurrency) {
  current = c;
  listeners.forEach((l) => l());
}

function timezoneGuess(): PlanCurrency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Africa/Lagos") return "USD";
    if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Indiana|Kentucky|North_Dakota|Juneau|Sitka|Nome|Adak|Menominee|Metlakatla|Yakutat)/.test(tz) || tz === "Pacific/Honolulu") return "USD";
  } catch {
    /* ignore */
  }
  return "GBP";
}

async function detect() {
  if (detected) return;
  detected = true;
  const saved = window.localStorage.getItem(STORAGE_KEY) as PlanCurrency | null;
  if (saved && PLAN_CURRENCIES.includes(saved)) return set(saved);
  try {
    const { country } = await getVisitorCountry();
    set(country ? currencyForCountry(country) : timezoneGuess());
  } catch {
    set(timezoneGuess());
  }
}

/** Currency used to show plan prices and open checkout. */
export function usePlanCurrency() {
  const currency = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => "GBP" as PlanCurrency,
  );
  useEffect(() => {
    void detect();
  }, []);
  const setCurrency = (c: PlanCurrency) => {
    window.localStorage.setItem(STORAGE_KEY, c);
    set(c);
  };
  return { currency, setCurrency };
}

export function CurrencySwitch({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = usePlanCurrency();
  return (
    <div
      role="group"
      aria-label="Price currency"
      className={`inline-flex rounded-full border border-border bg-card p-0.5 ${className}`}
    >
      {PLAN_CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={currency === c}
          onClick={() => setCurrency(c)}
          className={`rounded-full px-3 py-1 font-mono text-[11px] transition-colors ${
            currency === c ? "bg-mahogany text-cream" : "text-foreground/70"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
