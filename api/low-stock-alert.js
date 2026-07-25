// Appelé directement par un trigger Postgres (via pg_net) dès qu'une variante
// de produit franchit le seuil de stock bas — pas besoin d'attendre le résumé
// du lendemain matin. Protégé par un secret partagé (pas d'auth utilisateur
// possible ici, l'appelant est la base de données elle-même).

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

export default async function handler(req, res) {
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
