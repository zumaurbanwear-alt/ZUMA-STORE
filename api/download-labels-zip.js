import { createClient } from "@supabase/supabase-js";

// --- ZIP writer minimal, méthode STORE (pas de compression) ---
// Volontairement sans dépendance npm (jszip/archiver) : une dépendance
// mal résolue au build a déjà fait planter le déploiement une fois
// (recharts). Le format ZIP "store" est simple à écrire à la main et
// ne demande aucune lib externe — juste zlib pour le CRC32.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);

  const day =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0xf) << 5) |
    (date.getDate() & 0x1f);

  return { time, day };
}

function buildZip(files) {
  // files: [{ name: string, data: Buffer }]
  const { time, day } = dosDateTime(new Date());

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {

    const nameBuf = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const size = file.data.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8); // store
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(day, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, file.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10); // store
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(day, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + size;
  }

  const centralDirSize = centralParts.reduce((s, b) => s + b.length, 0);
  const centralDirOffset = offset;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirSize, 12);
  end.writeUInt32LE(centralDirOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

// Nom de fichier sûr (évite tout caractère qui casserait le zip ou le
// système de fichiers de l'admin qui télécharge).
function safeFileName(raw) {
  return String(raw).replace(/[^a-zA-Z0-9_-]/g, "_");
}

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {

    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        error: "Missing token",
      });
    }

    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        error: "orderIds required",
      });
    }

    if (orderIds.length > 100) {
      return res.status(400).json({
        error: "Trop de commandes sélectionnées (max 100).",
      });
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({
        error: "Invalid session",
      });
    }

    const {
      data: adminRole,
    } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return res.status(403).json({
        error: "Admin only",
      });
    }

    const {
      data: orders,
      error: ordersError,
    } = await supabase
      .from("orders")
      .select("id, display_id, shipping_label_url")
      .in("id", orderIds);

    if (ordersError) {
      return res.status(500).json({
        error: ordersError.message,
      });
    }

    const withLabel = (orders ?? []).filter((o) => o.shipping_label_url);

    if (withLabel.length === 0) {
      return res.status(400).json({
        error: "Aucune des commandes sélectionnées n'a de bordereau.",
      });
    }

    const files = [];
    const skipped = [];

    for (const order of withLabel) {

      try {

        const labelResponse = await fetch(order.shipping_label_url);

        if (!labelResponse.ok) {
          skipped.push(order.display_id);
          continue;
        }

        const arrayBuffer = await labelResponse.arrayBuffer();

        files.push({
          name: `commande-${safeFileName(order.display_id)}.pdf`,
          data: Buffer.from(arrayBuffer),
        });

      } catch (err) {
        console.error("LABEL FETCH ERROR:", order.id, err);
        skipped.push(order.display_id);
      }
    }

    if (files.length === 0) {
      return res.status(500).json({
        error: "Impossible de récupérer les bordereaux (tous les téléchargements ont échoué).",
      });
    }

    const zipBuffer = buildZip(files);

    if (skipped.length > 0) {
      console.warn("LABELS SKIPPED:", skipped);
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bordereaux-${Date.now()}.zip"`
    );
    res.setHeader("X-Skipped-Count", String(skipped.length));

    return res.status(200).send(zipBuffer);

  } catch (error) {

    console.error("DOWNLOAD LABELS ZIP ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });

  }

}
