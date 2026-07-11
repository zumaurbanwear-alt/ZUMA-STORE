// Vercel Serverless Function — served at /api/sitemap
// Regenerates the sitemap on every request directly from Supabase,
// so new/removed products are reflected automatically with no manual
// editing and no redeploy required.

const { createClient } = require("@supabase/supabase-js");

const SITE_URL = "https://zumaurbanwear.store";

module.exports = async (req, res) => {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );

  const { data: products, error } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("is_visible", true);

  if (error) {
    console.error("sitemap: failed to fetch products", error);
  }

  const staticUrls = [
    { loc: `${SITE_URL}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE_URL}/shop`, changefreq: "weekly", priority: "0.9" },
  ];

  const productUrls = (products ?? []).map((p) => ({
    loc: `${SITE_URL}/product/${p.slug}`,
    changefreq: "monthly",
    priority: "0.7",
    lastmod: p.updated_at ? p.updated_at.split("T")[0] : undefined,
  }));

  const urls = [...staticUrls, ...productUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
};
