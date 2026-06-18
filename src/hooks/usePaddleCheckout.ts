import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: {
    priceId: string;
    customerEmail?: string;
    customData?: Record<string, string>;
    successUrl?: string;
  }) => {
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);
      console.info("[Paddle] Opening checkout", {
        humanPriceId: options.priceId,
        paddlePriceId,
        origin: window.location.origin,
        successUrl: options.successUrl,
      });
      // Global event listener — surfaces checkout.error etc. that don't go through Checkout.open callbacks
      try {
        window.Paddle.Update?.({
          eventCallback: (data: any) => {
            if (data?.name?.includes("error") || data?.name === "checkout.error") {
              console.error("[Paddle event]", data?.name, data);
            } else {
              console.debug("[Paddle event]", data?.name, data);
            }
          },
        });
      } catch (e) {
        console.warn("[Paddle] Could not attach eventCallback", e);
      }
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: options.customerEmail ? { email: options.customerEmail } : undefined,
        customData: options.customData,
        settings: {
          displayMode: "overlay",
          successUrl:
            options.successUrl || `${window.location.origin}/checkout/success`,
          allowLogout: false,
          variant: "one-page",
        },
        successCallback: (data: any) => console.info("[Paddle] success", data),
        closeCallback: (data: any) => console.info("[Paddle] closed", data),
        errorCallback: (err: any) => console.error("[Paddle] errorCallback", err),
      });
    } catch (err) {
      console.error("[Paddle] openCheckout threw", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
