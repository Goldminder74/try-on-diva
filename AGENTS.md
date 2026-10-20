# Authentication

- Existing protected shopper, retailer and admin layouts are client-only (`ssr: false`), because their sign-in session lives in browser storage; retain server-side authorization on every private server function.
- Retailer login uses router navigation and a shared safe return-destination helper, so requested pages and checkout selections survive sign-in without a full-page reload.