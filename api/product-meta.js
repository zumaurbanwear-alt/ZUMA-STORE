// Vercel Serverless Function — served at /api/product-meta?slug=...
//
// The site is a client-rendered SPA: every route resolves to the same
// index.html with the same static og:title/og:image, because there's no
// server-side rendering. That's invisible to a human (the SPA takes over
// and renders the right product), but link-preview bots (Instagram,
// WhatsApp, Facebook, TikTok, Slack...) don't execute JS — they read the
// <head> of whatever HTML they're given and stop. Today that means every
// shared product link previews as the generic homepage.
//
// vercel.json routes ONLY bot user-agents for /product/:slug here; real
// visitors keep hitting index.html/the SPA as normal (see the `has`
// condition on that rewrite). This function fetches the one product,
// escapes its fields, and returns a minimal HTML document with correct
// per-product og:/twitter: tags plus a redirect for the rare case a bot
// (or a human whose client didn't get filtered) does render the page.

const { createClient } = require("@supabase/supabase-js");

const SITE_URL = "https://zumaurbanwear.store";

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Resize/re-encode via the same free image proxy the app already uses for
// product photos (see src/hooks/useProducts.ts), sized for OG previews.
const ogImage = (url) => {
  if (!url || !/^https?:\/\//.test(url)) return `${SITE_URL}/og-image.jpg`;
  const params = new URLSearchParams({ url, w: "1200", h: "630", fit: "cover", output: "jpg", q: "80" });
  return `https://wsrv.nl/?${params.toString()}`;
};

module.exports = async (req, res) => {
  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  const productUrl = `${SITE_URL}/product/${encodeURIComponent(slug)}`;

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );

  const { data: product, error } = await supabase
    .from("products")
    .select("name, description, price, image_url")
    .eq("slug", slug)
    .eq("is_visible", true)
    .maybeSingle();

  if (error) console.error("product-meta: failed to fetch product", error);

  // Unknown/hidden slug — fall back to generic site meta rather than 404ing
  // a bot (it'll just preview the site as a whole, which is still correct).
  const title = product ? `${product.name} — ZÜMA` : "ZÜMA — STORE";
  const description = product
    ? (product.description?.trim() || `${product.price} MAD — ZÜMA`)
    : "with züma, explore what remains when everything external is stripped away.";
  const image = product ? ogImage(product.image_url) : `${SITE_URL}/og-image.jpg`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="product" />
<meta property="og:site_name" content="ZÜMA" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(productUrl)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<meta http-equiv="refresh" content="0; url=${escapeHtml(productUrl)}" />
<link rel="canonical" href="${escapeHtml(productUrl)}" />
</head>
<body>
<a href="${escapeHtml(productUrl)}">${escapeHtml(title)}</a>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(html);
};
