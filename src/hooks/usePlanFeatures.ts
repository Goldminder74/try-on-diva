import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPlanFeatures } from "@/lib/try-on.functions";
import { planFeatures, type PlanFeatures } from "@/lib/entitlements";
import { useAuth } from "@/contexts/auth-context";

/** The signed-in shopper's plan and what it unlocks. */
export function usePlanFeatures(): { features: PlanFeatures; isLoading: boolean } {
  const { user } = useAuth();
  const fetchFeatures = useServerFn(getMyPlanFeatures);

  const q = useQuery({
    queryKey: ["plan-features", user?.id ?? "anon"],
    queryFn: () => fetchFeatures(),
    enabled: !!user,
    staleTime: 60_000,
  });

  return {
    features: (q.data as PlanFeatures | undefined) ?? planFeatures("free"),
    isLoading: !!user && q.isLoading,
  };
}
