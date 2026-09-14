import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface CheckoutOptions {
  priceId: string;
  customerEmail?: string;
  userId?: string;
  /** Where to send the shopper once the payment is complete. */
  successUrl?: string;
  /** Legacy shape kept for existing call sites: { userId, ... }. */
  customData?: Record<string, string>;
}

interface CheckoutContextValue {
  openCheckout: (options: CheckoutOptions) => Promise<void>;
  loading: boolean;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

function CheckoutFrame({ options }: { options: CheckoutOptions }) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const returnUrl =
      options.successUrl ?? `${window.location.origin}/checkout/success`;
    const result = await createCheckoutSession({
      data: {
        priceId: options.priceId,
        customerEmail: options.customerEmail,
        userId: options.userId ?? options.customData?.userId,
        returnUrl,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Checkout could not be started.");
    return result.clientSecret;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.priceId, options.customerEmail, options.userId, options.successUrl]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={checkoutOptions}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [loading, setLoading] = useState(false);

  const openCheckout = useCallback(async (opts: CheckoutOptions) => {
    setLoading(true);
    try {
      setOptions(opts);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({ openCheckout, loading }), [openCheckout, loading]);

  return (
    <CheckoutContext.Provider value={value}>
      {children}
      <Dialog open={!!options} onOpenChange={(open) => !open && setOptions(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Checkout</DialogTitle>
          </DialogHeader>
          {options ? <CheckoutFrame key={options.priceId} options={options} /> : null}
        </DialogContent>
      </Dialog>
    </CheckoutContext.Provider>
  );
}

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used inside CheckoutProvider");
  return ctx;
}
