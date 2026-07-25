import { createClient } from "@supabase/supabase-js";


// Déclenché par Vercel Cron chaque matin (voir vercel.json). Vercel envoie
// automatiquement un header "Authorization: Bearer <CRON_SECRET>" — on le
// vérifie pour être sûr que ce n'est pas n'importe qui qui déclenche l'envoi.
function isAuthorizedCronRequest(req) {
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

const LOW_STOCK_THRESHOLD = 3;

const fmt = (n) => `${Number(n ?? 0).toLocaleString("fr-FR")}`;

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

const STATUS_LABELS = {
  pending: "En attente",
  confirmed: "Confirmée",
};

function statusBadge(order) {
  if (order.return_code || order.shipping_status_return) {
    return { label: "Retour demandé", bg: "#FEF3C7", fg: "#B45309" };
  }
  const s = (order.status ?? "").trim().toLowerCase();
  return {
    label: STATUS_LABELS[s] ?? s ?? "—",
    bg: "#FEE2E2",
    fg: "#DC2626",
  };
}

function buildEmailHtml({ dateLabel, ordersCount, revenue, needsAction, transitCount, deliveredWeekCount, returnedCount, lowStock, adminUrl }) {
  const actionRows = needsAction.length
    ? needsAction
        .map((o) => {
          const badge = statusBadge(o);
          return `
            <tr style="border-top:1px solid #e5e5e5;">
              <td style="padding:9px 10px;font-size:12px;font-weight:bold;">#${escapeHtml(o.display_id)}</td>
              <td style="padding:9px 10px;font-size:12px;">${escapeHtml(o.customer_name)}</td>
              <td style="padding:9px 10px;font-size:11px;"><span style="background:${badge.bg};color:${badge.fg};padding:2px 6px;font-weight:bold;">${escapeHtml(badge.label)}</span></td>
            </tr>`;
        })
        .join("")
    : `<tr><td colspan="3" style="padding:12px 10px;font-size:12px;color:#9CA3AF;">Rien à traiter — tout est à jour 🎉</td></tr>`;

  const stockRows = lowStock.length
    ? lowStock
        .map(
          (p) => `
            <tr style="border-top:1px solid #e5e5e5;">
              <td style="padding:9px 10px;font-size:12px;">${escapeHtml(p.label)}</td>
              <td style="padding:9px 10px;font-size:12px;font-weight:bold;color:#DC2626;" align="right">${p.stock}</td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="2" style="padding:12px 10px;font-size:12px;color:#9CA3AF;">Aucun stock critique</td></tr>`;

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f2;font-family:'Courier New',monospace;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #111111;max-width:600px;width:100%;">
  <tr>
    <td style="background-color:#111111;padding:24px 28px;">
      <div style="color:#ffffff;font-size:20px;letter-spacing:4px;font-weight:bold;">ZÜMA — STORE</div>
      <div style="color:#9CA3AF;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Résumé du ${escapeHtml(dateLabel)}</div>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 28px 8px 28px;">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#DC2626;font-weight:bold;margin-bottom:14px;">HIER EN CHIFFRES</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="border:1px solid #e5e5e5;padding:14px;">
            <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#9CA3AF;">Commandes</div>
            <div style="font-size:26px;font-weight:bold;color:#111111;margin-top:4px;">${ordersCount}</div>
          </td>
          <td width="4"></td>
          <td width="50%" style="border:1px solid #e5e5e5;padding:14px;">
            <div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#9CA3AF;">Chiffre d'affaires</div>
            <div style="font-size:26px;font-weight:bold;color:#111111;margin-top:4px;">${fmt(revenue)} <span style="font-size:14px;font-weight:normal;">MAD</span></div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 28px 8px 28px;">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#DC2626;font-weight:bold;margin-bottom:10px;">⚠ À TRAITER</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #111111;">
        <tr style="background-color:#f4f4f2;">
          <td style="padding:8px 10px;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#666;">Commande</td>
          <td style="padding:8px 10px;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#666;">Client</td>
          <td style="padding:8px 10px;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#666;">Statut</td>
        </tr>
        ${actionRows}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 28px 8px 28px;">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#111111;font-weight:bold;margin-bottom:10px;">PIPELINE LIVRAISON</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="border:1px solid #e5e5e5;padding:12px 4px;">
            <div style="font-size:20px;font-weight:bold;color:#3B82F6;">${transitCount}</div>
            <div style="font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;margin-top:2px;">En transit</div>
          </td>
          <td width="3"></td>
          <td align="center" style="border:1px solid #e5e5e5;padding:12px 4px;">
            <div style="font-size:20px;font-weight:bold;color:#DC2626;">${deliveredWeekCount}</div>
            <div style="font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;margin-top:2px;">Livrées (semaine)</div>
          </td>
          <td width="3"></td>
          <td align="center" style="border:1px solid #e5e5e5;padding:12px 4px;">
            <div style="font-size:20px;font-weight:bold;color:#B45309;">${returnedCount}</div>
            <div style="font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;margin-top:2px;">Retours</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 28px 8px 28px;">
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#111111;font-weight:bold;margin-bottom:10px;">STOCK BAS</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #111111;">
        <tr style="background-color:#f4f4f2;">
          <td style="padding:8px 10px;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#666;">Produit</td>
          <td style="padding:8px 10px;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#666;" align="right">Restant</td>
        </tr>
        ${stockRows}
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:26px 28px 30px 28px;">
      <a href="${adminUrl}" style="display:block;background-color:#111111;color:#ffffff;text-align:center;padding:14px;font-size:11px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;font-weight:bold;">Ouvrir le panel admin →</a>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 28px;border-top:1px solid #e5e5e5;">
      <div style="font-size:9px;color:#9CA3AF;letter-spacing:0.5px;">Envoyé automatiquement chaque matin à 8h · ZÜMA STORE</div>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
}

async function handleDailySummary(req, res) {
  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY missing");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const startOfYesterday = new Date(now);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Commandes créées hier
    const { data: yesterdayOrders, error: yErr } = await supabase
      .from("orders")
      .select("id, total")
      .gte("created_at", startOfYesterday.toISOString())
      .lt("created_at", startOfToday.toISOString());

    if (yErr) throw yErr;

    const ordersCount = yesterdayOrders?.length ?? 0;
    const revenue = (yesterdayOrders ?? []).reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // Commandes qui nécessitent une action : en attente de confirmation, ou retour demandé
    const { data: needsAction, error: aErr } = await supabase
      .from("orders")
      .select("id, display_id, customer_name, status, return_code, shipping_status_return")
      .or("status.eq.pending,return_code.not.is.null")
      .order("created_at", { ascending: false })
      .limit(20);

    if (aErr) throw aErr;

    // Pipeline
    const { count: transitCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("shipping_status", ["WAREHOUSE", "TRANSIT", "DISTRIBUTED", "DELIVERING"]);

    const { count: deliveredWeekCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("shipping_status", "DELIVERED")
      .gte("delivered_at", sevenDaysAgo.toISOString());

    const { count: returnedCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .not("return_code", "is", null);

    // Stock bas — par variante (couleur + taille), pas juste le total produit :
    // un produit à 9 en stock peut cacher une taille précise déjà à 0.
    const { data: lowStockVariants, error: sErr } = await supabase
      .from("product_variants")
      .select("stock, color, size, products(name, is_visible)")
      .lte("stock", LOW_STOCK_THRESHOLD)
      .order("stock", { ascending: true })
      .limit(20);

    if (sErr) throw sErr;

    const lowStock = (lowStockVariants ?? [])
      .filter((v) => v.products?.is_visible)
      .map((v) => ({
        label: `${v.products?.name ?? "?"} — ${v.color} — ${v.size}`,
        stock: v.stock,
      }));

    const dateLabel = startOfYesterday.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const adminUrl = `${process.env.VITE_SITE_URL || "https://zumaurbanwear.store"}/zm-portal-x92-login`;

    const html = buildEmailHtml({
      dateLabel,
      ordersCount,
      revenue,
      needsAction: needsAction ?? [],
      transitCount: transitCount ?? 0,
      deliveredWeekCount: deliveredWeekCount ?? 0,
      returnedCount: returnedCount ?? 0,
      lowStock,
      adminUrl,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.DAILY_SUMMARY_FROM || "ZÜMA <resume@zumaurbanwear.store>",
        to: [process.env.DAILY_SUMMARY_TO],
        subject: `Résumé ZÜMA — ${ordersCount} commande(s), ${fmt(revenue)} MAD`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error("Resend error", errBody);
      return res.status(502).json({ error: "Email send failed", details: errBody });
    }

    return res.status(200).json({ ok: true, ordersCount, revenue });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message ?? "Unexpected error" });
  }
}


// Appelé directement par un trigger Postgres (via pg_net) dès qu'une variante
// de produit franchit le seuil de stock bas — pas besoin d'attendre le résumé
// du lendemain matin. Protégé par un secret partagé (pas d'auth utilisateur
// possible ici, l'appelant est la base de données elle-même).

async function handleLowStockAlert(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = req.headers["x-webhook-secret"];
  if (!secret || secret !== process.env.LOW_STOCK_ALERT_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { product, color, size, stock } = req.body ?? {};

    if (!product || !color || !size || stock === undefined) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const urgency = stock === 0 ? "RUPTURE" : "STOCK BAS";
    const urgencyColor = stock === 0 ? "#DC2626" : "#B45309";

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f2;font-family:'Courier New',monospace;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;padding:32px 0;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #111111;max-width:480px;width:100%;">
  <tr>
    <td style="background-color:${urgencyColor};padding:18px 24px;">
      <div style="color:#ffffff;font-size:14px;letter-spacing:3px;font-weight:bold;">⚠ ${urgency}</div>
    </td>
  </tr>
  <tr>
    <td style="padding:24px;">
      <div style="font-size:18px;font-weight:bold;color:#111111;margin-bottom:12px;">${escapeHtml(product)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e5;">
        <tr>
          <td style="padding:10px;font-size:11px;text-transform:uppercase;color:#9CA3AF;">Couleur</td>
          <td style="padding:10px;font-size:13px;font-weight:bold;" align="right">${escapeHtml(color)}</td>
        </tr>
        <tr style="border-top:1px solid #e5e5e5;">
          <td style="padding:10px;font-size:11px;text-transform:uppercase;color:#9CA3AF;">Taille</td>
          <td style="padding:10px;font-size:13px;font-weight:bold;" align="right">${escapeHtml(size)}</td>
        </tr>
        <tr style="border-top:1px solid #e5e5e5;">
          <td style="padding:10px;font-size:11px;text-transform:uppercase;color:#9CA3AF;">Stock restant</td>
          <td style="padding:10px;font-size:13px;font-weight:bold;color:${urgencyColor};" align="right">${stock}</td>
        </tr>
      </table>
      <a href="https://zumaurbanwear.store/zm-portal-x92-login" style="display:block;margin-top:20px;background-color:#111111;color:#ffffff;text-align:center;padding:12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:bold;">Réapprovisionner →</a>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.DAILY_SUMMARY_FROM || "ZÜMA <resume@zumaurbanwear.store>",
        to: [process.env.DAILY_SUMMARY_TO],
        subject: `${urgency} — ${product} (${color}, ${size})`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errBody = await resendResponse.text();
      console.error("Resend error", errBody);
      return res.status(502).json({ error: "Email send failed", details: errBody });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message ?? "Unexpected error" });
  }
}


// Point d'entrée unique : Vercel Hobby limite à 12 fonctions serverless,
// donc les deux notifications (résumé quotidien + alerte stock bas) sont
// regroupées ici et dispatchées selon ?type=.
export default async function handler(req, res) {
  const type = req.query.type;

  if (type === "low-stock-alert") {
    return handleLowStockAlert(req, res);
  }

  if (type === "daily-summary" || !type) {
    return handleDailySummary(req, res);
  }

  return res.status(400).json({ error: "Unknown type" });
}
