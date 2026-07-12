// Calling this warms the browser's module cache for the Product page chunk.
// App.tsx's `lazy(() => import("./pages/Product.tsx"))` resolves against the
// same specifier, so a hover-triggered call here means the chunk is often
// already downloaded by the time the user clicks through.
export const preloadProductPage = () => import("./Product.tsx");
