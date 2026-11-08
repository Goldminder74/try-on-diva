import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** Visitor's country from the hosting edge (two-letter code), if known. */
export const getVisitorCountry = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ country: string | null }> => {
    const req = getRequest();
    const c = req?.headers.get("cf-ipcountry");
    return { country: c && /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : null };
  },
);
