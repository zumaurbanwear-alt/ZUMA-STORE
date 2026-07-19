import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AudioProvider } from "@/context/AudioContext";
import { Loader } from "@/components/zuma/common/Loader";
import { ErrorBoundary } from "@/components/zuma/common/ErrorBoundary";
import { ScrollToHash } from "./components/zuma/common/ScrollToHash";
import Index from "./pages/Index";

// Index is the landing page most visitors hit first, so it ships in the
// main bundle instead of being code-split — that way its hero image is
// discoverable by the browser's preload scanner immediately, instead of
// waiting on a route-chunk fetch before the image request can even start.
// Every other route is still code-split so first load stays lean.
const Shop = lazy(() => import("./pages/Shop"));
const Product = lazy(() => import("./pages/Product.preload").then((m) => m.preloadProductPage()));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Faq = lazy(() => import("./pages/Faq"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Contact = lazy(() => import("./pages/Contact"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Sonner />
      <BrowserRouter>
       <LanguageProvider>
        <AudioProvider>
        <CartProvider>
          <ScrollToHash />
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:slug" element={<Product />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/zm-portal-x92" element={<Admin />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/shipping" element={<ShippingPolicy />} />
              <Route path="/returns" element={<ReturnPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/contact" element={<Contact />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </CartProvider>
        </AudioProvider>
       </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
