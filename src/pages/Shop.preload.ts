// Calling this warms the browser's module cache for the Shop page chunk.
// App.tsx's `lazy(() => import("./pages/Shop.tsx"))` resolves against the
// same specifier, so a hover-triggered call here (from the "Shop" nav
// link) means the chunk is often already downloaded by the time the user
// clicks through — same pattern as Product.preload.ts for product cards.
export const preloadShopPage = () => import("./Shop");
